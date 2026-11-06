// utils/cropImage.js
export default function getCroppedImg(imageSrc, pixelCrop, rotation = 0) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = imageSrc;
        image.crossOrigin = "anonymous";

        image.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            const rotRad = (rotation * Math.PI) / 180;
            const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
                image.width,
                image.height,
                rotation
            );

            // Rotate image into intermediate canvas
            canvas.width = bBoxWidth;
            canvas.height = bBoxHeight;

            ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
            ctx.rotate(rotRad);
            ctx.translate(-image.width / 2, -image.height / 2);
            ctx.drawImage(image, 0, 0);

            // Crop into final canvas
            const croppedCanvas = document.createElement("canvas");
            const croppedCtx = croppedCanvas.getContext("2d");
            croppedCanvas.width = pixelCrop.width;
            croppedCanvas.height = pixelCrop.height;

            croppedCtx.drawImage(
                canvas,
                pixelCrop.x,
                pixelCrop.y,
                pixelCrop.width,
                pixelCrop.height,
                0,
                0,
                pixelCrop.width,
                pixelCrop.height
            );

            croppedCanvas.toBlob(
                (blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error("Canvas is empty"));
                },
                "image/jpeg",
                0.9
            );
        };

        image.onerror = reject;
    });
}

function rotateSize(width, height, rotation) {
    const rotRad = (rotation * Math.PI) / 180;
    return {
        width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
        height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    };
}