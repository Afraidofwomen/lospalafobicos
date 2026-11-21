import assert from "node:assert/strict";
import { test } from "node:test";
import { imageProblem, readImageInfo } from "./image.ts";

function jpeg(width: number, height: number): Buffer {
  const buf = Buffer.alloc(32, 0);
  buf[0] = 0xff;
  buf[1] = 0xd8;
  buf[2] = 0xff;
  buf[3] = 0xc0;
  buf[6] = 8;
  buf.writeUInt16BE(height, 7);
  buf.writeUInt16BE(width, 9);
  return buf;
}

test("lee el tamaño de un JPEG", () => {
  const info = readImageInfo(jpeg(320, 240));
  assert.deepEqual(info, { type: "jpeg", width: 320, height: 240 });
});

test("rechaza un lado mayor a 1280", () => {
  assert.match(imageProblem(jpeg(2000, 100), 1_500_000) ?? "", /1280/);
});

test("rechaza algo que no es imagen", () => {
  assert.match(imageProblem(Buffer.from("hola"), 1_500_000) ?? "", /JPEG/);
});
