import {generateMerkleRoot} from "./main.provider";
import {imgToAsciiArt} from "./generate.provider";

const CHARSET = Array.from({length: 127}, (_, i) => String.fromCharCode(i)).join('');
const DecodeMaxSize = 10000;
const contractChunkSize = 850;

function addLines(beforeStr: string, width: number) {
    let result:string[] = [];
    for (let i = 0; i < beforeStr.length; i += width) {
        result.push(beforeStr.slice(i, i + width));
    }
    return result.join('\n');
}
function _getChunk(message: string, chunkSize: number) {
    let chunks: string[] = [];
    for (let i = 0; i < message.length; i += chunkSize) {
        chunks.push(message.slice(i, i + chunkSize));
    }
    return chunks;
}
interface compressedChunk {
    method: number,
    result: string
}
interface chunkObjectType  {
    text_list: string[],
    method: number,//offset
}
export async function makeAsciiChunks(imgUrl:string) {
    let originalChunks:string[] = []
    let compressedChunks: compressedChunk[] = []
    let totalChunks:chunkObjectType[] = []
    let chunkSize = 0;
    let asciiString =await imgToAsciiArt(imgUrl)
    if (asciiString) {
        let ascii = asciiString.replace(/\n/g, "");  // 모든 \n을 빈 문자열로 대체
        originalChunks = _getChunk(ascii, DecodeMaxSize);
        const merkleroot = generateMerkleRoot(originalChunks);

        for (let originalChunk of originalChunks) {
            let _compressChunk = compress(originalChunk);
            compressedChunks.push(_compressChunk);
        }
        for (let compressChunk of compressedChunks) {
            let _contractchunks = _getChunk(compressChunk.result, contractChunkSize);
            const chunkObj: chunkObjectType = {
                text_list: _contractchunks,
                method: compressChunk.method,//offset
            }
            await totalChunks.push(chunkObj);
            chunkSize += _contractchunks.length;
        }
        const resultObj = {
            chunkList: totalChunks,
            chunkSize: chunkSize,
            merkleRoot: merkleroot,
        }
        return resultObj;
    }else{
        return false;
    }
}

function extractValue(text: string, key: string) {
    const regex = new RegExp(`${key}:\\s*(\\d+)`); // key와 숫자 값을 찾는 정규식
    if (text == undefined) return -1;

    const match = text.match(regex); // 정규식으로 매칭
    if (match && match[1]) {
        return parseInt(match[1], 10); // 숫자형으로 변환
    }
    return -1;
}

function divideHeader(input: string) {
    const closingBracketIndex = input.indexOf(']');
    if (closingBracketIndex === -1) {
        return {
            header: "null",
            content: input
        };
    }
    const header = input.slice(0, closingBracketIndex+1);
    const content = input.slice(closingBracketIndex +1);

    return {
        header: header,
        content: content
    };
}

const METHOD: { [key: number]: string } = {
    0: "RLE",
    1: "BASE7"
};

const charToNumber: { [key: string]: number } = {
    " ": 0,
    "$": 1,
    "J": 2,
    "I": 3,
    "i": 4,
    ":": 5,
    "'": 6,
};

const numberToChar: { [key: number]: string } = {
    0: " ",
    1: "$",
    2: "J",
    3: "I",
    4: "i",
    5: ":",
    6: "'",
};

// Types
interface CompressData {
    ascii: string;
    maxlen?: number;
}

interface DecompressData {
    original_text: string;
    method: number;
    maxlen?: number;
}

// Utility Functions
function mapTextToSingleDigitNumbers(text: string): string {
    return Array.from(text)
        .map(char => charToNumber[char]?.toString() || '0')
        .join('');
}

function mapNumbersToText(numberString: string): string {
    return Array.from(numberString)
        .filter(num => num.match(/\d/))
        .map(num => numberToChar[parseInt(num)] || '')
        .join('');
}

function base7ToBase10(octal: string): bigint {
    return BigInt(parseInt(octal, 7));
}

function base10ToBase7(decimal: bigint): string {
    if (decimal === BigInt(0)) return "0";

    const result: string[] = [];
    let num = decimal;

    while (num > BigInt(0)) {
        result.push((num % BigInt(7)).toString());
        num = num / BigInt(7);
    }

    return result.reverse().join('');
}

function decimalToBase127(decimal: string | number | bigint): string {
    if (decimal === 0 || decimal === "0" || decimal === BigInt(0)) return CHARSET[0];

    let base127Str = "";
    let num = BigInt(decimal);
    const charsetLength = BigInt(CHARSET.length);

    while (num > BigInt(0)) {
        const index = Number(num % charsetLength); // CHARSET 인덱싱을 위해 Number로 변환 (127보다 작은 수이므로 안전)
        base127Str = CHARSET[index] + base127Str;
        num = num / charsetLength;
    }

    return base127Str;
}

function decodeFromBase127(base127Str: string): string {
    // 큰 숫자를 문자열로 처리
    let result = '0';
    for (let i = 0; i < base127Str.length; i++) {
        // multiply by 127 and add new digit
        let temp = BigInt(result) * BigInt(127) + BigInt(CHARSET.indexOf(base127Str[i]));
        result = temp.toString();
    }
    return result;
}

function rleEncode(data: string): [number[], string[]] {
    if (!data) return [[], []];

    const encodedNum: number[] = [];
    const encodedText: string[] = [];
    let count = 1;

    for (let i = 1; i < data.length; i++) {
        if (data[i] === data[i - 1] && count < 9) {
            count++;
        } else {
            encodedNum.push(count);
            encodedText.push(data[i - 1]);
            count = 1;
        }
    }

    encodedNum.push(count);
    encodedText.push(data[data.length - 1]);

    return [encodedNum, encodedText];
}

function makeRleList(text: string): string {
    const [encodedNum, encodedText] = rleEncode(text);
    const countlist = encodedNum.join('');
    const textlist = encodedText.join('');
    const mappedText = mapTextToSingleDigitNumbers(textlist);
    return countlist + mappedText;
}

function rleDecode(encodedNum: number[], encodedText: string[]): string {
    let result = '';
    const minLength = Math.min(encodedNum.length, encodedText.length);

    for (let i = 0; i < minLength; i++) {
        if (encodedText[i] !== undefined) {
            result += encodedText[i].repeat(encodedNum[i] || 0);
        }
    }

    return result;
}

function decryptRleList(bignumList: string): string {
    // bignumList가 매우 큰 숫자의 문자열이므로 직접 처리
    const longnumber = bignumList;
    const mid = Math.floor(longnumber.length / 2);
    const countlist = longnumber.slice(0, mid);
    const textlist = longnumber.slice(mid);

    // 각 숫자를 개별적으로 처리
    const encodedNum = Array.from(countlist).map(n => {
        const num = parseInt(n);
        return isNaN(num) ? 1 : num; // NaN인 경우 기본값 1 사용
    });
    const mappedText = mapNumbersToText(textlist);

    return rleDecode(encodedNum, Array.from(mappedText));
}

function decryptBase7(base10number: bigint): string {
    const decodedBase7 = base10ToBase7(base10number);
    return mapNumbersToText(decodedBase7);
}

function compress(originalText: string): compressedChunk{
    const splitText = originalText.split(']');
    let text = splitText.length > 1 ? splitText[1] : originalText;
    text = text.replace(/\n/g, '');

    let result = '-1';
    let method = -1;
    let rlenum: string;
    try {
        rlenum = makeRleList(text);
    } catch {
        rlenum = text;
    }
    if (rlenum.length < text.length * 85 / 100) {
        method = 0;
        console.log("optimise with rle");

        const decimalValue = rlenum;
        const base127Value = decimalToBase127(parseInt(decimalValue));
        result = base127Value;

        console.log("Original number length:", text.length);
        console.log("base127 value length:", base127Value.length);
    } else {
        method = 1;
        console.log("optimise with base7: rate 59.83%");

        const mappedNumbers = parseInt(mapTextToSingleDigitNumbers(text));
        const decimalValue = base7ToBase10(mappedNumbers.toString());
        const base127Value = decimalToBase127(decimalValue);
        result = base127Value;

        console.log("Original number length:", originalText.length);
        console.log("Compressed value length:", base127Value.length);
    }

    if (splitText.length > 1) {
        result = splitText[0] + ' ]' + result;
    }
    let finalResult:compressedChunk = {method:method, result:result};

    return finalResult;
}

function decompress(compressedText: string, methodNum: number, maxlen: number = 10000): string {
    let removeHeader = compressedText;
    let headerPart = '';

    if (compressedText.startsWith('[ width: ')) {
        const index = compressedText.indexOf(']');
        headerPart = compressedText.slice(0, index + 1);
        removeHeader = compressedText.slice(index + 1);
    }

    const method = METHOD[methodNum];
    const decodedBase10 = decodeFromBase127(removeHeader);

    let asciiText: string;
    if (method === 'RLE') {
        asciiText = decryptRleList(decodedBase10);
    } else {
        try {
            const bigNum = BigInt(decodedBase10);
            asciiText = decryptBase7(bigNum);
        } catch (error) {
            console.error('Error processing number:', error);
            asciiText = '';
        }
    }

    if (headerPart.length > 1) {
        asciiText = headerPart + asciiText;
    }
    return asciiText;
}


export const decodeByChunks = (chunks: any) => {
    let compressedText: string = "";
    let method: number;
    let resultText: string = "";
    for (const chunk of chunks) {
        if (chunk.code) {
            compressedText += chunk.code;
            method = chunk.method;
            if (chunk.decode_break == 1) {
                const decodedTxt = decompress(compressedText, method);
                resultText += decodedTxt;
                compressedText = "";
            }
        }
    }
    return resultText;
}

export const getDecodedChunks = (chunks: any, blockTime = 0) => {
    let compressedText: string = "";
    let method: number;
    let resultChunks: string[] = [];
    for (const chunk of chunks) {
        if (chunk.code) {
            compressedText += chunk.code;
            method = chunk.method;
            if (chunk.decode_break == 1) {
                const decodedTxt = decompress(compressedText, method);
                resultChunks.push(decodedTxt);
                compressedText = "";
            }
        }

        if (blockTime < 1739113519 && blockTime > 1739109169) {
            let temp = "";
            temp = resultChunks.join('')
            const header_check = divideHeader(temp);
            if (header_check.header != "null") {
                const width = extractValue(header_check.header, 'width');

                const cleanedText = header_check.content.replace(/[\n\r]/g, '');
                const full_text = addLines(cleanedText, width);
                resultChunks =  _getChunk(header_check.header + full_text, DecodeMaxSize)
            }

        } else if (blockTime < 1739109169) {
            let temp = "";
            temp = resultChunks.join('')
            const header_check = divideHeader(temp);
            if (header_check.header != "null") {
                const width = extractValue(header_check.header, 'width');

                const cleanedText = header_check.content.replace(/[\n\r]/g, '');
                const full_text = addLines(cleanedText, width);
                resultChunks = _getChunk("[ width: " + width + " ]" + full_text, DecodeMaxSize)
            }
        }

    }
    return resultChunks;
}