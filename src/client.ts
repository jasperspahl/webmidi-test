import { error } from "./errors";
export interface NoteColor {
	node: number;
	color: string;
}

export const post = async (data: NoteColor[]) => {
	try {
		const response = await fetch("/api", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(data)
		});
		if (!response.ok) {
			error`Failed to post data: ${response.statusText}`;
		}
	} catch (err) {
		error`Failed to post data: ${err}`;
	}
}
