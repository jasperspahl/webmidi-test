export const map = (value: number, in_min: number, in_max: number, out_min: number, out_max: number) => {
	return (value - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

export const html = (strings: TemplateStringsArray, ...args: any[]) => {
	return String.raw(strings, ...args);
}
