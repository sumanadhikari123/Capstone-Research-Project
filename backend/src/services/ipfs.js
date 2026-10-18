export async function addToIpfs(fileBuffer, filename, apiUrl) {
  const form = new FormData();
  form.append("file", new Blob([fileBuffer]), filename);

  const response = await fetch(`${apiUrl}/add?pin=true`, {
    method: "POST",
    body: form
  });

  if (!response.ok) {
    throw new Error(`IPFS upload failed: ${response.status}`);
  }

  const text = await response.text();
  const result = text.trim().split("\n").pop();
  return JSON.parse(result);
}
