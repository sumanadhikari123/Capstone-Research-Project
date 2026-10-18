// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title PharmaTraceability
/// @notice Ethereum/EVM smart contract for multi-stakeholder pharmaceutical traceability.
/// @dev Designed for local Hardhat research evaluation. Sensitive documents remain off-chain.
contract PharmaTraceability is AccessControl {
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant PHARMACY_ROLE = keccak256("PHARMACY_ROLE");
    bytes32 public constant REGULATOR_ROLE = keccak256("REGULATOR_ROLE");

    enum Status { NONE, MANUFACTURED, IN_TRANSIT, RECEIVED, DISPENSED }
    enum VerificationStatus { PENDING, VERIFIED }

    struct Organization {
        string organizationId;
        string role;
        bool active;
    }

    struct Product {
        string productId;
        string productName;
        string manufacturerId;
        string description;
        uint256 createdAt;
        bool exists;
    }

    struct Batch {
        string batchId;
        string productId;
        string manufacturerId;
        string currentOwner;
        string currentLocation;
        string manufactureDate;
        string expiryDate;
        string documentHash;
        Status status;
        VerificationStatus verificationStatus;
        string complianceStatus;
        uint256 createdAt;
        bool exists;
    }

    struct TraceEvent {
        string eventType;
        string organizationId;
        address actor;
        string details;
        uint256 timestamp;
        bytes32 previousHash;
        bytes32 eventHash;
    }

    struct Shipment {
        string batchId;
        string destinationOrganizationId;
        string trackingNumber;
        uint256 createdAt;
        address createdBy;
    }

    mapping(address => Organization) private _organizationsByAddress;
    mapping(bytes32 => bytes32) private _orgRoleById;
    mapping(bytes32 => Product) private _products;
    mapping(bytes32 => Batch) private _batches;
    mapping(bytes32 => TraceEvent[]) private _history;
    mapping(bytes32 => Shipment[]) private _shipments;

    event ProductCreated(string indexed productId, string manufacturerId, address indexed actor, uint256 timestamp, bytes32 eventHash);
    event BatchCreated(string indexed batchId, string productId, string manufacturerId, address indexed actor, uint256 timestamp, bytes32 eventHash);
    event ShipmentCreated(string indexed batchId, string destinationOrganizationId, string trackingNumber, address indexed actor, uint256 timestamp, bytes32 eventHash);
    event BatchTransferred(string indexed batchId, string fromOrganizationId, string toOrganizationId, address indexed actor, uint256 timestamp, bytes32 eventHash);
    event BatchReceived(string indexed batchId, string organizationId, address indexed actor, uint256 timestamp, bytes32 eventHash);
    event BatchVerified(string indexed batchId, string organizationId, address indexed actor, uint256 timestamp, bytes32 eventHash);
    event BatchDispensed(string indexed batchId, string organizationId, address indexed actor, uint256 timestamp, bytes32 eventHash);
    event ComplianceUpdated(string indexed batchId, string status, string note, address indexed actor, uint256 timestamp, bytes32 eventHash);
    event OrganizationRegistered(string indexed organizationId, string role, address indexed account);

    constructor(
        address manufacturer,
        address distributor,
        address pharmacy,
        address regulator,
        string memory manufacturerOrg,
        string memory distributorOrg,
        string memory pharmacyOrg,
        string memory regulatorOrg
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANUFACTURER_ROLE, manufacturer);
        _grantRole(DISTRIBUTOR_ROLE, distributor);
        _grantRole(PHARMACY_ROLE, pharmacy);
        _grantRole(REGULATOR_ROLE, regulator);

        _registerOrganization(manufacturer, manufacturerOrg, "MANUFACTURER", MANUFACTURER_ROLE);
        _registerOrganization(distributor, distributorOrg, "DISTRIBUTOR", DISTRIBUTOR_ROLE);
        _registerOrganization(pharmacy, pharmacyOrg, "PHARMACY", PHARMACY_ROLE);
        _registerOrganization(regulator, regulatorOrg, "REGULATOR", REGULATOR_ROLE);
    }

    modifier onlyTraceRole() {
        require(
            hasRole(MANUFACTURER_ROLE, msg.sender) ||
            hasRole(DISTRIBUTOR_ROLE, msg.sender) ||
            hasRole(PHARMACY_ROLE, msg.sender) ||
            hasRole(REGULATOR_ROLE, msg.sender),
            "Unauthorized organization"
        );
        _;
    }

    function _registerOrganization(
        address account,
        string memory organizationId,
        string memory role,
        bytes32 roleId
    ) internal {
        require(account != address(0), "Organization account required");
        require(bytes(organizationId).length > 0, "Organization ID required");
        _organizationsByAddress[account] = Organization(organizationId, role, true);
        _orgRoleById[keccak256(bytes(organizationId))] = roleId;
        emit OrganizationRegistered(organizationId, role, account);
    }

    function registerOrganization(
        address account,
        string calldata organizationId,
        string calldata role
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bytes32 roleHash = keccak256(bytes(role));
        bytes32 roleId;
        if (roleHash == keccak256("MANUFACTURER")) roleId = MANUFACTURER_ROLE;
        else if (roleHash == keccak256("DISTRIBUTOR")) roleId = DISTRIBUTOR_ROLE;
        else if (roleHash == keccak256("PHARMACY")) roleId = PHARMACY_ROLE;
        else if (roleHash == keccak256("REGULATOR")) roleId = REGULATOR_ROLE;
        else revert("Unsupported role");

        _grantRole(roleId, account);
        _registerOrganization(account, organizationId, role, roleId);
    }

    function getOrganization(address account) external view returns (Organization memory) {
        return _organizationsByAddress[account];
    }

    /// @notice Returns the on-chain organization identity for an Ethereum account.
    /// @dev The contract is the source of truth; callers should not need to supply this value.
    function getCallerOrganization() external view returns (string memory organizationId, string memory role, bool active) {
        Organization memory organization = _organizationsByAddress[msg.sender];
        return (organization.organizationId, organization.role, organization.active);
    }

    function createProduct(
        string calldata productId,
        string calldata productName,
        string calldata _manufacturerId,
        string calldata description
    ) external onlyRole(MANUFACTURER_ROLE) returns (bytes32) {
        bytes32 key = keccak256(bytes(productId));
        require(!_products[key].exists, "Product already exists");

        // Authorization is already enforced by onlyRole(MANUFACTURER_ROLE).
        // Resolve the organisation identity from the authenticated Ethereum account.
        // Do not depend on a mutable display-role string for authorization.
        Organization memory organization = _organizationsByAddress[msg.sender];
        require(organization.active, "Manufacturer organization not registered");
        require(bytes(organization.organizationId).length > 0, "Manufacturer organization ID missing");
        string memory resolvedManufacturerId = organization.organizationId;

        _products[key] = Product(
            productId,
            productName,
            resolvedManufacturerId,
            description,
            block.timestamp,
            true
        );

        bytes32 eventHash = _recordEvent(key, "PRODUCT_CREATED", resolvedManufacturerId, productId);
        emit ProductCreated(productId, resolvedManufacturerId, msg.sender, block.timestamp, eventHash);
        return eventHash;
    }

    function readProduct(string calldata productId) external view returns (Product memory) {
        Product memory product = _products[keccak256(bytes(productId))];
        require(product.exists, "Product not found");
        return product;
    }

    function createBatch(
        string calldata batchId,
        string calldata productId,
        string calldata _manufacturerId,
        string calldata currentLocation,
        string calldata manufactureDate,
        string calldata expiryDate,
        string calldata documentHash
    ) external onlyRole(MANUFACTURER_ROLE) returns (bytes32) {
        bytes32 key = keccak256(bytes(batchId));
        require(!_batches[key].exists, "Batch already exists");
        require(_products[keccak256(bytes(productId))].exists, "Product not found");
        require(bytes(documentHash).length == 64, "Document SHA-256 hash required");

        // Authorization is already enforced by onlyRole(MANUFACTURER_ROLE).
        // Resolve the organisation identity from the authenticated Ethereum account.
        // The caller-supplied manufacturerId remains only for ABI compatibility.
        Organization memory organization = _organizationsByAddress[msg.sender];
        require(organization.active, "Manufacturer organization not registered");
        require(bytes(organization.organizationId).length > 0, "Manufacturer organization ID missing");
        string memory resolvedManufacturerId = organization.organizationId;
        _manufacturerId;

        _batches[key] = Batch(
            batchId,
            productId,
            resolvedManufacturerId,
            resolvedManufacturerId,
            currentLocation,
            manufactureDate,
            expiryDate,
            documentHash,
            Status.MANUFACTURED,
            VerificationStatus.PENDING,
            "PENDING",
            block.timestamp,
            true
        );

        bytes32 eventHash = _recordEvent(key, "BATCH_CREATED", resolvedManufacturerId, "batch created");
        emit BatchCreated(batchId, productId, resolvedManufacturerId, msg.sender, block.timestamp, eventHash);
        return eventHash;
    }

    function readBatch(string calldata batchId) external view returns (Batch memory) {
        Batch memory batch = _batches[keccak256(bytes(batchId))];
        require(batch.exists, "Batch not found");
        return batch;
    }

    function createShipment(
        string calldata batchId,
        string calldata destinationOrganizationId,
        string calldata trackingNumber
    ) external onlyTraceRole returns (bytes32) {
        bytes32 key = keccak256(bytes(batchId));
        Batch storage batch = _batches[key];
        require(batch.exists, "Batch not found");
        require(
            hasRole(MANUFACTURER_ROLE, msg.sender) || hasRole(DISTRIBUTOR_ROLE, msg.sender),
            "Shipment role not allowed"
        );
        require(_isCurrentOwner(batch.currentOwner, msg.sender), "Current owner required");
        require(
            _orgRoleById[keccak256(bytes(destinationOrganizationId))] != bytes32(0),
            "Unknown destination organization"
        );

        _shipments[key].push(
            Shipment(batchId, destinationOrganizationId, trackingNumber, block.timestamp, msg.sender)
        );
        bytes32 eventHash = _recordEvent(
            key,
            "SHIPMENT_CREATED",
            batch.currentOwner,
            destinationOrganizationId
        );
        emit ShipmentCreated(
            batchId,
            destinationOrganizationId,
            trackingNumber,
            msg.sender,
            block.timestamp,
            eventHash
        );
        return eventHash;
    }

    function transferBatch(
        string calldata batchId,
        string calldata recipientOrganizationId,
        string calldata location
    ) external onlyTraceRole returns (bytes32) {
        bytes32 key = keccak256(bytes(batchId));
        Batch storage batch = _batches[key];
        require(batch.exists, "Batch not found");
        require(
            hasRole(MANUFACTURER_ROLE, msg.sender) || hasRole(DISTRIBUTOR_ROLE, msg.sender),
            "Transfer role not allowed"
        );
        require(_isCurrentOwner(batch.currentOwner, msg.sender), "Current owner required");
        require(
            batch.status == Status.MANUFACTURED || batch.status == Status.RECEIVED,
            "Invalid batch status for transfer"
        );
        bytes32 recipientRole = _orgRoleById[keccak256(bytes(recipientOrganizationId))];
        require(recipientRole != bytes32(0), "Unknown recipient organization");
        require(
            keccak256(bytes(recipientOrganizationId)) != keccak256(bytes(batch.currentOwner)),
            "Recipient must differ from current owner"
        );

        string memory from = batch.currentOwner;
        batch.currentOwner = recipientOrganizationId;
        batch.currentLocation = location;
        batch.status = Status.IN_TRANSIT;
        batch.verificationStatus = VerificationStatus.PENDING;

        bytes32 eventHash = _recordEvent(key, "BATCH_TRANSFERRED", from, recipientOrganizationId);
        emit BatchTransferred(
            batchId,
            from,
            recipientOrganizationId,
            msg.sender,
            block.timestamp,
            eventHash
        );
        return eventHash;
    }

    function receiveBatch(string calldata batchId, string calldata location) external onlyTraceRole returns (bytes32) {
        bytes32 key = keccak256(bytes(batchId));
        Batch storage batch = _batches[key];
        require(batch.exists, "Batch not found");
        require(
            hasRole(DISTRIBUTOR_ROLE, msg.sender) || hasRole(PHARMACY_ROLE, msg.sender),
            "Receive role not allowed"
        );
        require(_isCurrentOwner(batch.currentOwner, msg.sender), "Receiving organization required");
        require(batch.status == Status.IN_TRANSIT, "Batch is not in transit");

        batch.status = Status.RECEIVED;
        if (bytes(location).length > 0) batch.currentLocation = location;

        bytes32 eventHash = _recordEvent(key, "BATCH_RECEIVED", batch.currentOwner, location);
        emit BatchReceived(batchId, batch.currentOwner, msg.sender, block.timestamp, eventHash);
        return eventHash;
    }

    function verifyBatch(string calldata batchId) external onlyTraceRole returns (bytes32) {
        bytes32 key = keccak256(bytes(batchId));
        Batch storage batch = _batches[key];
        require(batch.exists, "Batch not found");
        require(
            hasRole(DISTRIBUTOR_ROLE, msg.sender) ||
            hasRole(PHARMACY_ROLE, msg.sender) ||
            hasRole(REGULATOR_ROLE, msg.sender),
            "Verify role not allowed"
        );
        require(bytes(batch.documentHash).length == 64, "Document SHA-256 hash required");
        require(
            keccak256(bytes(batch.complianceStatus)) != keccak256(bytes("NON_COMPLIANT")),
            "Non-compliant batch cannot be verified"
        );

        if (!hasRole(REGULATOR_ROLE, msg.sender)) {
            require(_isCurrentOwner(batch.currentOwner, msg.sender), "Current owner required");
            require(batch.status == Status.RECEIVED, "Batch must be received before verification");
        }

        Organization memory organization = _organizationsByAddress[msg.sender];
        require(organization.active, "Verifier organization not registered");

        batch.verificationStatus = VerificationStatus.VERIFIED;
        bytes32 eventHash = _recordEvent(
            key,
            "BATCH_VERIFIED",
            organization.organizationId,
            "verified"
        );
        emit BatchVerified(
            batchId,
            organization.organizationId,
            msg.sender,
            block.timestamp,
            eventHash
        );
        return eventHash;
    }

    function dispenseBatch(string calldata batchId) external onlyRole(PHARMACY_ROLE) returns (bytes32) {
        bytes32 key = keccak256(bytes(batchId));
        Batch storage batch = _batches[key];
        require(batch.exists, "Batch not found");
        require(_isCurrentOwner(batch.currentOwner, msg.sender), "Pharmacy must be current owner");
        require(batch.status == Status.RECEIVED, "Batch must be received");
        require(batch.verificationStatus == VerificationStatus.VERIFIED, "Batch must be verified");
        require(
            keccak256(bytes(batch.complianceStatus)) != keccak256(bytes("NON_COMPLIANT")),
            "Non-compliant batch cannot be dispensed"
        );

        batch.status = Status.DISPENSED;
        bytes32 eventHash = _recordEvent(key, "BATCH_DISPENSED", batch.currentOwner, "dispensed");
        emit BatchDispensed(batchId, batch.currentOwner, msg.sender, block.timestamp, eventHash);
        return eventHash;
    }

    function updateComplianceStatus(
        string calldata batchId,
        string calldata status,
        string calldata note
    ) external onlyRole(REGULATOR_ROLE) returns (bytes32) {
        bytes32 key = keccak256(bytes(batchId));
        Batch storage batch = _batches[key];
        require(batch.exists, "Batch not found");
        require(bytes(status).length > 0, "Compliance status required");
        batch.complianceStatus = status;
        batch.verificationStatus = VerificationStatus.PENDING;

        Organization memory organization = _organizationsByAddress[msg.sender];
        require(organization.active, "Regulator organization not registered");

        bytes32 eventHash = _recordEvent(
            key,
            "COMPLIANCE_UPDATED",
            organization.organizationId,
            string.concat(status, ":", note)
        );
        emit ComplianceUpdated(
            batchId,
            status,
            note,
            msg.sender,
            block.timestamp,
            eventHash
        );
        return eventHash;
    }

    function getBatchHistory(string calldata batchId) external view returns (TraceEvent[] memory) {
        bytes32 key = keccak256(bytes(batchId));
        require(_batches[key].exists, "Batch not found");
        return _history[key];
    }

    function verifyHistoryIntegrity(string calldata batchId) external view returns (bool, bytes32) {
        bytes32 key = keccak256(bytes(batchId));
        TraceEvent[] memory entries = _history[key];
        bytes32 previous = bytes32(0);

        for (uint256 i = 0; i < entries.length; i++) {
            TraceEvent memory entry = entries[i];
            bytes32 expected = keccak256(
                abi.encodePacked(
                    key,
                    entry.eventType,
                    entry.organizationId,
                    entry.actor,
                    entry.details,
                    entry.timestamp,
                    previous
                )
            );
            if (expected != entry.eventHash || entry.previousHash != previous) {
                return (false, entry.eventHash);
            }
            previous = entry.eventHash;
        }

        return (true, previous);
    }

    function shipmentCount(string calldata batchId) external view returns (uint256) {
        return _shipments[keccak256(bytes(batchId))].length;
    }

    function _recordEvent(
        bytes32 key,
        string memory eventType,
        string memory organizationId,
        string memory details
    ) internal returns (bytes32) {
        TraceEvent[] storage entries = _history[key];
        bytes32 previous = entries.length == 0 ? bytes32(0) : entries[entries.length - 1].eventHash;
        uint256 timestamp = block.timestamp;
        bytes32 eventHash = keccak256(
            abi.encodePacked(
                key,
                eventType,
                organizationId,
                msg.sender,
                details,
                timestamp,
                previous
            )
        );
        entries.push(
            TraceEvent(
                eventType,
                organizationId,
                msg.sender,
                details,
                timestamp,
                previous,
                eventHash
            )
        );
        return eventHash;
    }

    function _isCurrentOwner(string memory organizationId, address account) internal view returns (bool) {
        Organization memory organization = _organizationsByAddress[account];
        return organization.active &&
            keccak256(bytes(organizationId)) == keccak256(bytes(organization.organizationId));
    }
}