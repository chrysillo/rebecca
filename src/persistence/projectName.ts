/**
 * A project's name is also its filename (`projects/<name>.json`), so it is limited to characters
 * that are safe in a path: no slashes, and no leading dot (which also rules out "..").
 * Shared by the dev server and the rename field.
 */
export const isValidProjectName = (name: string): boolean =>
	/^[\w\- ().]{1,80}$/.test(name) &&
	!name.startsWith(".") &&
	name.trim() === name;

/** The first of "Untitled", "Untitled 2", "Untitled 3", … not already taken. */
export function nextFreeName(
	taken: Iterable<string>,
	base = "Untitled",
): string {
	const names = new Set(taken);
	if (!names.has(base)) return base;
	for (let i = 2; ; i++) if (!names.has(`${base} ${i}`)) return `${base} ${i}`;
}
