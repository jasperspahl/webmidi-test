import "./style.css";
import { error, info } from "./errors";
import { map } from "./utils";
import { NoteColor } from "./client";
import { defineKeyboardElement, KeyboardKey, PianoKeyboard } from "./keyboard";

defineKeyboardElement();

let midiInput: MIDIInput;


let selectingstate: "hue" | "brightness" | null = null;
let brightnessControl: number | null = null;
let hueControl: number | null = null;
let state: {[key: number]: {brightness: number, hue: number}} = {};
let activeNodes: number[] = [];
let lastHue = 0;

const setBrightness = (brightness: number) => {
	for (let node of activeNodes) {
		state[node] = state[node] || { brightness: 0, hue: 0 };
		state[node].brightness = brightness;
	}
}
const setHue = (hue: number) => {
	lastHue = hue;
	for (let node of activeNodes) {
		state[node] = state[node] || { brightness: 0, hue: 0 };
		state[node].hue = hue;
	}
	document.querySelector<HTMLSpanElement>("#currentColor")!.style.backgroundColor = `hsl(${map(hue, 0, 127, 0 ,360)}, 100%, 50%)`;
};


const convertStateToNodeColors: () => NoteColor[] = () => {
	const nodeColors: NoteColor[] = [];
	for (let node in state) {
		const { brightness, hue } = state[node];
		if (brightness === 0) continue;
		nodeColors.push({ node: Number(node), color: `hsl(${map(hue, 0, 127, 0 ,360)}, 100%, ${map(brightness, 0, 127, 30, 70)}%)` });
	}
	return nodeColors;
}

const app = document.querySelector<HTMLDivElement>("#app")!;

function onNoteOn(this: PianoKeyboard, ev: CustomEvent<KeyboardKey>) {
	const { detail } = ev;
	const { midi } = detail;
	state[midi] = { brightness: 127, hue: lastHue };
	activeNodes.push(midi);
	this.update(convertStateToNodeColors());
}

function onNoteOff(this: PianoKeyboard, ev: CustomEvent<KeyboardKey>) {
	const { detail } = ev;
	const { midi } = detail;
	activeNodes = activeNodes.filter((node) => node !== midi);
	this.update(convertStateToNodeColors());
}

function onMIDIMessage(this: MIDIInput, ev: Event){
	const midiMessageDiv = document.querySelector<HTMLDivElement>("#midiMessage")!;
	if (ev instanceof MIDIMessageEvent) {
		const { data } = ev;
		const [status, note, velocity] = data;
		midiMessageDiv.innerHTML = `Status: 0x${status.toString(16)} Note: ${note} Velocity: ${velocity}`;
		switch (status) {
			case 0x90: // Node On
				state[note] = { brightness: 128 - velocity, hue: lastHue };
				activeNodes.push(note);
				break;
			case 0x80: // Node Off
				activeNodes = activeNodes.filter((node) => node !== note);
				break;
			case 0xb0: // Control Change
				if (selectingstate === "brightness") {
					brightnessControl = note;
					selectingstate = null;
					info`Brightness Control Selected: ${note}`;
				} else if (selectingstate === "hue") {
					hueControl = note;
					selectingstate = null;
					info`Hue Control Selected: ${note}`;
				} else if (brightnessControl === null && hueControl === null) {
					error`No controls selected`;
				} else {
					if (brightnessControl === note) {
						setBrightness(velocity);
					}
					if (hueControl === note) {
						setHue(velocity);
					}
				}
				break;
		}
		document.querySelector<PianoKeyboard>("piano-keyboard")!.update(convertStateToNodeColors());
	} else {
		error`Midi Message Event is not an instance of MIDIMessageEvent`;
	}
}

function onMIDISuccess(midiAccess: MIDIAccess) {
	app.innerHTML = `
		<p>Inputs: ${midiAccess.inputs.size}</p>
		<select id="midiInput">
		</select>
		<button id="selectBrightness" disabled>Select Brightness Control</button>
		<button id="selectHue" disabled>Select Hue Control</button>
		<p id="midiMessage">Status: 00 Data 0: 00 Data 1: 00</p>
		<p class="currentColor">Current Color: <span id="currentColor"></span></p>
		<piano-keyboard start="21" end="109"><piano-keyboard>`;

	const selectBrightnessButton = document.querySelector<HTMLButtonElement>("#selectBrightness")!;
	const selectHueButton = document.querySelector<HTMLButtonElement>("#selectHue")!;
	selectBrightnessButton.addEventListener("click", () => {
		selectingstate = "brightness";
	});
	selectHueButton.addEventListener("click", () => {
		selectingstate = "hue";
	});

	const pianoKeyboard = document.querySelector<PianoKeyboard>("piano-keyboard")!;
	pianoKeyboard.onNoteOn = onNoteOn;
	pianoKeyboard.onNoteOff = onNoteOff;

	const midiInputSelect = document.querySelector<HTMLSelectElement>("#midiInput")!;
	midiAccess.inputs.forEach((input) => {
		const option = new Option(`${input.name}`, input.id);
		midiInputSelect.add(option);
	});
	
	midiInputSelect.addEventListener("change", async () => {
		let input = midiAccess.inputs.get(midiInputSelect.value)!;
		if (midiInput) midiInput.onmidimessage = null;
		midiInput = input;
		input.onmidimessage = onMIDIMessage;
		const midiMessageDiv = document.querySelector<HTMLParagraphElement>("#midiMessage")!;
		midiMessageDiv.innerHTML = `Status: 00 Data 0: 00 Data 1: 00`;
		selectBrightnessButton.disabled = false;
		selectHueButton.disabled = false;
	});

}

const setupMidi = async () => {
	navigator.requestMIDIAccess().then(
		onMIDISuccess,
		(err) => {
			error`Midi Access Denied: ${err}`;
		}
	);
}

const setupButton = document.querySelector<HTMLButtonElement>("button#setupMidi")!;

setupButton.addEventListener("click", setupMidi);
