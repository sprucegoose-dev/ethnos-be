import pako from 'pako';

export default class PayloadCompressor {
    static gzip(data: any) {
        return pako.deflate(JSON.stringify(data));
    }
}
