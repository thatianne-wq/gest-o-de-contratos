// Logo PNG (gerada a partir do PDF enviado pela Retrofit) — embaixo no canto superior de cada aba.
const LOGO_URL =
  "https://media.base44.com/images/public/69e6c51f34292a547ec996ef/b4c4bbfa7_generated_image.png";

let cachedBuffer = null;

// Retorna o ArrayBuffer da logo (cacheado). O ExcelJS exige um buffer/buffer-like.
export async function getBrandImageBuffer() {
  if (cachedBuffer) return cachedBuffer;
  const res = await fetch(LOGO_URL);
  if (!res.ok) throw new Error("Não foi possível carregar a logo da Retrofit");
  cachedBuffer = await res.arrayBuffer();
  return cachedBuffer;
}