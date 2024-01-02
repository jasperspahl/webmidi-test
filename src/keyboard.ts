import { NoteColor } from "./client.ts";
import styles from  "./keyboard.css?raw";
import { html } from "./utils.ts";

export interface KeyboardKey {
	midi: number;
	note: string;
	freq: number;
	octave: number;
	offset: number; 
}

export const NOTE_ON_EVENT = "noteon";
export const NOTE_OFF_EVENT = "noteoff";

export class PianoKeyboard extends HTMLElement {

	private shadow: ShadowRoot;
	private keys: KeyboardKey[];
	
	private readonly notes = ['A','A#','B','C','C#','D','D#','E','F','F#','G','G#'];

	constructor() {
		super();
		this.shadow = this.attachShadow({ mode: "open" });
		this.shadow.innerHTML = `<style>${styles}</style>`;

		const start = Number(this.getAttribute("start")) || 21;
		const end = Number(this.getAttribute("end")) || 109;
		this.keys = this.freqs(start, end);
		this.shadow.innerHTML = this.render();
	}

	private getHz = (key: number = 0) => 440 * Math.pow(2, key - 69 / 12);

	private freqs(start: number, end: number): KeyboardKey[] {
		let black = 0,
			white = -2;
		return Array(end - start)
		.fill(0)
		.map((_, i) => {
			const key = (start + i - 69) % 12;
			const note = this.notes[key < 0 ? 12 + key : key];
			const octave = Math.ceil(4 + (start + i - 69) / 12);
			if (i === 0 && note === "C") black = -3;
			note.includes("#")
				? ((black += 3), ["C#", "F#"].includes(note) 
				   && (black += 3))
					   : (white += 3);

					   return {
						   note,
						   midi: start + i,
						   freq: this.getHz(start + i),
						   octave: note === "B" || note === "A#" 
							   ? octave - 1 : octave,
							   offset: note.includes("#") ? black : white,
					   };
		});
	}

	private renderKeys() {
		return this.keys
			.map(item =>
				 html`<button data-note="${item.note}${item.octave}" data-midi="${item.midi}" data-freq="${item.freq}" style="--gcs:${item.offset}" type="button"></button>`)
			.join("\n");
	}

	private render() {
		const whiteKeyCount = this.keys.filter(item => item.note.length === 1).length;
		return html`
			<style>${styles}</style>
			<div class="kb" style="--_r:${whiteKeyCount*3}">${this.renderKeys()}</div>
			<style id="midiStyle"></style>
		`;
	}

	update(data: NoteColor[]) {
		const midiStyle = this.shadow.querySelector<HTMLStyleElement>("#midiStyle")!;
		midiStyle.innerHTML = data
								.map(item => 
									   `button[data-midi="${item.node}"]::after {
											content: " ";
											position: absolute;
											top: 0;
											left: 0;
											width: 100%;
											height: 100%;
											background-color: ${item.color};
											opacity: 0.5;
									   }`
								  ).join("\n");
	}

	connectedCallback() {
		this.keys.forEach(item => {
			const button = this.shadow.querySelector<HTMLButtonElement>(`button[data-midi="${item.midi}"]`)!;
			button.addEventListener("mousedown", () => {
				this.dispatchEvent(
					new CustomEvent(NOTE_ON_EVENT, {
						detail: { ...item },
					})
				);
			});
			button.addEventListener("mouseup", () => {
				this.dispatchEvent(
					new CustomEvent(NOTE_OFF_EVENT, {
						detail: { ...item },
					})
				);
			});
		})
	}

	public set onNoteOn(fn: (this: PianoKeyboard, e: CustomEvent<KeyboardKey>) => void) {
		// @ts-ignore
		this.addEventListener(NOTE_ON_EVENT, fn);
	}

	public set onNoteOff(fn: (this: PianoKeyboard, e: CustomEvent<KeyboardKey>) => void) {
		// @ts-ignore
		this.addEventListener(NOTE_OFF_EVENT, fn);
	}
}

/**
 * Registers the piano-keyboard element.
 */
export const defineKeyboardElement: () => void = () => {
	customElements.define("piano-keyboard", PianoKeyboard);
}
