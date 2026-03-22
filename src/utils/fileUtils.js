export async function fileToMeta(file) {
  const dataUrl = await new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.readAsDataURL(file);
  });

  return {
    name: file.name,
    size: file.size,
    type: file.type,
    data: dataUrl,
  };
}