import { saveProject } from "@/persistence/api";
import { type DocumentState, toProjectFile } from "@/state/document";
import { useProjectsStore } from "@/state/projects";
import { useAppStore } from "@/state/store";

/**
 * Writes the active project to disk shortly after each change. Only the saved parts of the
 * document are watched (by reference), so selecting things doesn't rewrite the file.
 */

const DELAY_MS = 400;

type Saved = Pick<
	DocumentState,
	"pieces" | "stock" | "measurements" | "joints"
>;

/** The document parts last written (or loaded) for the active project. */
let baseline: Saved | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<void> | null = null;

const savedParts = ({
	pieces,
	stock,
	measurements,
	joints,
}: DocumentState): Saved => ({ pieces, stock, measurements, joints });

const isDirty = (doc: DocumentState) =>
	baseline !== null &&
	(doc.pieces !== baseline.pieces ||
		doc.stock !== baseline.stock ||
		doc.measurements !== baseline.measurements ||
		doc.joints !== baseline.joints);

const setStatus = (saveStatus: "saved" | "saving" | "error") =>
	useProjectsStore.setState({ saveStatus });

/** Call after loading a document: it matches the file, so there is nothing to save yet. */
export function markSaved(doc: DocumentState) {
	baseline = savedParts(doc);
	if (timer) clearTimeout(timer);
	timer = null;
	setStatus("saved");
}

/** Writes any unsaved change now, waiting for a save already under way. */
export async function flush(): Promise<void> {
	if (timer) clearTimeout(timer);
	timer = null;
	while (inFlight) await inFlight;

	const name = useProjectsStore.getState().active;
	const doc = useAppStore.getState().doc;
	if (!name || !isDirty(doc)) return;

	const parts = savedParts(doc);
	inFlight = saveProject(name, toProjectFile(doc))
		.then(() => {
			baseline = parts;
			// A change made while writing gets its own save.
			setStatus(isDirty(useAppStore.getState().doc) ? "saving" : "saved");
		})
		.catch((err: Error) => {
			setStatus("error");
			useAppStore
				.getState()
				.showNotice(`Couldn't save "${name}": ${err.message}`);
		})
		.finally(() => {
			inFlight = null;
		});
	await inFlight;
}

/** Starts watching the document. Returns a function that stops. */
export function startAutosave(): () => void {
	const unsubscribe = useAppStore.subscribe((state) => {
		if (!isDirty(state.doc)) return;
		setStatus("saving");
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => void flush(), DELAY_MS);
	});

	// Last-chance save when the tab closes (the debounce may not have fired yet).
	const onUnload = () => {
		const name = useProjectsStore.getState().active;
		const doc = useAppStore.getState().doc;
		if (name && isDirty(doc))
			saveProject(name, toProjectFile(doc), { keepalive: true }).catch(
				() => {},
			);
	};
	window.addEventListener("beforeunload", onUnload);

	return () => {
		unsubscribe();
		window.removeEventListener("beforeunload", onUnload);
	};
}
