import {
    createCanvas,
    loadImage
} from 'canvas';

async function imgToAsciiArt(imageSrc:string, fontSize = 5, outputHeight = 700) {
    try {
        const image = await loadImage(imageSrc);
        const canvas = createCanvas(1, 1);
        const ctx = canvas.getContext('2d');

        // Calculate aspect ratio and resize canvas
        const aspectRatio = image.width / image.height;
        const outputWidth = Math.floor(outputHeight * aspectRatio);
        canvas.width = outputWidth;
        canvas.height = outputHeight;

        // Draw the resized image on the canvas
        ctx.drawImage(image, 0, 0, outputWidth, outputHeight);
        let result:string[] = [];
        for (let y = 0; y < canvas.height; y += fontSize) {
            let _line = '';

            for (let x = 0; x < canvas.width; x += fontSize) {
                const pixelData = ctx.getImageData(x, y, 1, 1).data; // Get RGBA values
                const [r, g, b, a] = pixelData;
                let char;
                if (a > 0) {
                    const brightness = (r + g + b) / 3;
                    // Map brightness to characters
                    if (brightness < 51) {
                        char = ' ';
                    } else if (brightness < 102) {
                        char = "'";
                    } else if (brightness < 140) {
                        char = ':';
                    } else if (brightness < 170) {
                        char = 'i';
                    } else if (brightness < 200) {
                        char = 'I';
                    } else if (brightness < 210) {
                        char = 'J';
                    } else {
                        char = '$';
                    }
                } else {
                    char = ' ';
                }
                _line += char;
            }
            result.push(_line);
        }
        let result_string = result.join('\n');
        return "[ width: " + result[0].length.toString() + " ]" + result_string;
    } catch (error) {
        console.error('Error loading image:', error);
        throw new Error('Image loading failed: ' + error);
    }
}

export { imgToAsciiArt };
