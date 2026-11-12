// Dă panoului de administrare adresa Supabase și cheia PUBLICĂ (publishable),
// citite din setările Vercel. Astfel cheile nu stau în cod și nici pe GitHub.
// Cheia publishable e făcută să ajungă în browser: accesul real e controlat de RLS în Supabase.
module.exports = function handler(req, res) {
  const { SUPABASE_URL, SUPABASE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Lipsesc SUPABASE_URL / SUPABASE_KEY în setările Vercel" });
  }
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ url: SUPABASE_URL, key: SUPABASE_KEY });
};
