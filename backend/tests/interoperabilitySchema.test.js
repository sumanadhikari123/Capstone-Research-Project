import test from "node:test";
import assert from "node:assert/strict";
import schema from "../../interoperability/schema/trace-event.schema.json" with { type: "json" };

test("standard schema has required interoperability fields", () => {
  const fields = schema.required;
  for (const name of [
    "eventVersion","eventId","eventType","timestamp",
    "organizationId","batchId","productId","location","status"
  ]) {
    assert.ok(fields.includes(name));
  }
  assert.equal(schema.properties.eventVersion.pattern, "^1\\.0$");
});
