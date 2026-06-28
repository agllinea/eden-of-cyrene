export async function fileToDataUrl(file: File) {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(reader.error);
		reader.onload = () => resolve(String(reader.result));
		reader.readAsDataURL(file);
	});
}
