// Mantém os testes independentes da organização física dos arquivos.
export function testFilePath(name) {
  if (name.endsWith(".css")) return "assets/css/" + name;
  if ((name.endsWith(".js") || name.endsWith(".mjs")) && name !== "sw.js")
    return "assets/js/" + name;
  return name;
}
