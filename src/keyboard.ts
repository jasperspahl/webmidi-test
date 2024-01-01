import { NoteColor } from "./client.ts";
import styles from  "./keyboard.css?raw";
import { html } from "./utils.ts";
const getHz = (key: number = 0) => 440 * Math.pow(2, key - 69 / 12);
const notes = ['A','A#','B','C','C#','D','D#','E','F','F#','G','G#'];

interface KeyboardKey {
	midi: number;
	note: string;
	freq: number;
	octave: number;
	offset: number; 
}

function freqs(start: number, end: number): KeyboardKey[] {
	let black = 0,
		white = -2;
	return Array(end - start)
	.fill(0)
	.map((_, i) => {
		const key = (start + i - 69) % 12;
		const note = notes[key < 0 ? 12 + key : key];
		const octave = Math.ceil(4 + (start + i - 69) / 12);
		if (i === 0 && note === "C") black = -3;
		note.includes("#")
			? ((black += 3), ["C#", "F#"].includes(note) 
			   && (black += 3))
				   : (white += 3);

				   return {
					   note,
					   midi: start + i,
					   freq: getHz(start + i),
					   octave: note === "B" || note === "A#" 
						   ? octave - 1 : octave,
						   offset: note.includes("#") ? black : white,
				   };
	});
};


const render = (data: KeyboardKey[]) =>
	data.map(item =>
		 html`<button data-note="${item.note}${item.octave}" data-midi=${item.midi} data-freq="${item.freq}" style="--gcs:${item.offset}" type="button"></button>`).join("\n");


export const createKeyboard = (start: number, end: number) => {
	const keyboard = document.querySelector<HTMLDivElement>("#keyboard")!;
	const shadowRoot = keyboard.attachShadow({ mode: "open" });
	shadowRoot.innerHTML =
		`<style>${styles}</style>
		<div class="kb">${render(freqs(start, end))}</div>
		<style id="midiStyle"></style>`;
}

export const updateKeyboard = (data: NoteColor[]) => {
	const keyboard = document.querySelector<HTMLDivElement>("#keyboard")!;
	const midiStyle = keyboard.shadowRoot!.querySelector<HTMLStyleElement>("#midiStyle")!;
	midiStyle.innerHTML = data.map(item => `button[data-midi="${item.node}"] { background-color: ${item.color} !important;}`).join("\n");
}





