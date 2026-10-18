import crypto from 'node:crypto';

// Educational, non-production Schnorr proof-of-knowledge demo.
// It demonstrates the cryptographic idea of proving knowledge of a secret
// without revealing the secret itself. The proof is not a substitute for
// Fabric identities, endorsement policies or production cryptographic review.
const P = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F');
const N = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
const G = {
  x: BigInt('55066263022277343669578718895168534326250603453777594175500187360389116729240'),
  y: BigInt('32670510020758816978083085130507043184471273380659243275938904335757337482424')
};

function mod(a, m) { const r = a % m; return r < 0n ? r + m : r; }
function powMod(base, exp, m) {
  let b = mod(base, m);
  let e = exp;
  let result = 1n;
  while (e > 0n) {
    if (e & 1n) result = mod(result * b, m);
    b = mod(b * b, m);
    e >>= 1n;
  }
  return result;
}
function inv(a, m) {
  if (mod(a, m) === 0n) throw new Error('No modular inverse');
  return powMod(a, m - 2n, m);
}
function add(A, B) {
  if (!A) return B; if (!B) return A;
  if (A.x === B.x && mod(A.y + B.y, P) === 0n) return null;
  let m;
  if (A.x === B.x && A.y === B.y) m = mod(3n*A.x*A.x*inv(2n*A.y,P), P);
  else m = mod((B.y-A.y)*inv(B.x-A.x,P), P);
  const x = mod(m*m-A.x-B.x,P);
  const y = mod(m*(A.x-x)-A.y,P);
  return {x,y};
}
function mul(k, A=G) {
  let n=mod(k,N), R=null, Q=A;
  while(n>0n){ if(n&1n) R=add(R,Q); Q=add(Q,Q); n >>= 1n; }
  return R;
}
function hex32(n){ return n.toString(16).padStart(64,'0'); }
function bytesToBigInt(buf){ return BigInt('0x'+buf.toString('hex')); }
function challenge(R,Y,message){
  const h=crypto.createHash('sha256');
  h.update(Buffer.from(hex32(R.x)+hex32(R.y)+hex32(Y.x)+hex32(Y.y)+message,'utf8'));
  return mod(bytesToBigInt(h.digest()),N);
}
function randomScalar(){
  let x=0n;
  while(x===0n || x>=N) x=bytesToBigInt(crypto.randomBytes(32));
  return x;
}

export class ZeroKnowledgeProofService {
  generate(message) {
    const secret = randomScalar();
    const publicPoint = mul(secret);
    const nonce = randomScalar();
    const R = mul(nonce);
    const c = challenge(R, publicPoint, message);
    const s = mod(nonce + c*secret, N);
    return {
      publicKey: { x: hex32(publicPoint.x), y: hex32(publicPoint.y) },
      proof: { R: { x: hex32(R.x), y: hex32(R.y) }, s: hex32(s) },
      message
    };
  }

  verify({ publicKey, proof, message }) {
    try {
      const Y={x:BigInt('0x'+publicKey.x),y:BigInt('0x'+publicKey.y)};
      const R={x:BigInt('0x'+proof.R.x),y:BigInt('0x'+proof.R.y)};
      const s=BigInt('0x'+proof.s);
      const c=challenge(R,Y,message);
      const left = mul(s);
      const right = add(R, mul(c, Y));
      return Boolean(right) && left.x === right.x && left.y === right.y;
    } catch { return false; }
  }
}
