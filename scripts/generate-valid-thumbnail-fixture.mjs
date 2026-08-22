import sharp from "sharp";

const image = await sharp({
  create: {
    width: 24,
    height: 16,
    channels: 4,
    background: { r: 40, g: 111, b: 102, alpha: 1 },
  },
}).png().toBuffer();

console.log(image.toString("base64"));
