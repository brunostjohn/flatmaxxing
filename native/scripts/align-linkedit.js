const { execFileSync } = require("node:child_process");
const {
	existsSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} = require("node:fs");
const { join } = require("node:path");

const LC_SEGMENT_64 = 0x19;
const LC_SYMTAB = 0x2;
const LC_CODE_SIGNATURE = 0x1d;

const align8 = (offset) => (8 - (offset % 8)) % 8;

const findLoadCommands = (buffer) => {
	const ncmds = buffer.readUInt32LE(16);
	let offset = 32;
	let symtab = null;
	let linkedit = null;
	let codeSignature = null;

	for (let i = 0; i < ncmds; i++) {
		const command = buffer.readUInt32LE(offset);
		const size = buffer.readUInt32LE(offset + 4);

		if (command === LC_SEGMENT_64) {
			const name = buffer
				.subarray(offset + 8, offset + 24)
				.toString("ascii")
				.replace(/\0.*$/, "");
			if (name === "__LINKEDIT") linkedit = offset;
		}

		if (command === LC_SYMTAB) symtab = offset;
		if (command === LC_CODE_SIGNATURE) codeSignature = offset;

		offset += size;
	}

	if (symtab === null) {
		throw new Error("LC_SYMTAB not found");
	}

	return { symtab, linkedit, codeSignature };
};

const insertPadding = (buffer, offset, size) => {
	if (size === 0) return buffer;
	return Buffer.concat([
		buffer.subarray(0, offset),
		Buffer.alloc(size),
		buffer.subarray(offset),
	]);
};

const fixFile = (file) => {
	let buffer = readFileSync(file);
	const { symtab, linkedit, codeSignature } = findLoadCommands(buffer);
	const originalStringOffset = buffer.readUInt32LE(symtab + 16);
	const originalSignatureOffset =
		codeSignature === null ? 0 : buffer.readUInt32LE(codeSignature + 8);

	const stringPadding = align8(originalStringOffset);
	buffer = insertPadding(buffer, originalStringOffset, stringPadding);
	buffer.writeUInt32LE(originalStringOffset + stringPadding, symtab + 16);

	let totalPadding = stringPadding;
	if (codeSignature !== null) {
		let signatureOffset = originalSignatureOffset + stringPadding;
		const signaturePadding = align8(signatureOffset);
		buffer = insertPadding(buffer, signatureOffset, signaturePadding);
		signatureOffset += signaturePadding;
		totalPadding += signaturePadding;
		buffer.writeUInt32LE(signatureOffset, codeSignature + 8);
	}

	if (totalPadding === 0) return false;

	if (linkedit !== null) {
		const fileSize = Number(buffer.readBigUInt64LE(linkedit + 48));
		buffer.writeBigUInt64LE(BigInt(fileSize + totalPadding), linkedit + 48);
	}

	writeFileSync(file, buffer);
	execFileSync("codesign", ["--force", "--sign", "-", file], {
		stdio: "inherit",
	});
	return true;
};

const explicitFiles = process.argv.slice(2);
const files =
	explicitFiles.length > 0
		? explicitFiles
		: readdirSync(process.cwd())
				.filter((file) => file.endsWith(".node"))
				.map((file) => join(process.cwd(), file));

for (const file of files) {
	if (!existsSync(file)) {
		throw new Error(`Native addon not found: ${file}`);
	}

	const changed = fixFile(file);
	if (changed) {
		console.log(`Aligned LINKEDIT load commands in ${file}`);
	}
}
