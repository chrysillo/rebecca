/** Hands the browser a file to save. */
export function download(filename: string, data: Blob) {
	const url = URL.createObjectURL(data);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The active project's name, for export filenames. */
export const exportBaseName = (project: string | null) => project ?? "project";
