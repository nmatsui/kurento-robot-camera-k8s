import log4js from 'log4js';
const logger = log4js.getLogger('utils');
logger.level = process.env.LOG_LEVEL || 'debug';

export function getIceServers() {
    const STUN_LIST = process.env.STUN_LIST || '';
    const TURN_LIST = process.env.TURN_LIST || '';
    const STUN_RE = /^(stun:)?(.+)$/;
    const TURN_RE = /^(turn:)?([^@:]+):([^@:]+)@(turn:)?(.+)$/;

    logger.debug(`STUN_LIST=${STUN_LIST}`);
    let stunList = STUN_LIST
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0 && item.match(STUN_RE))
        .map(item => {
            let matches = item.match(STUN_RE);
            return {
                urls: `stun:${matches[2]}`
            };
        });

    logger.debug(`TURN_LIST=${TURN_LIST}`);
    let turnList = TURN_LIST
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0 && item.match(TURN_RE))
        .map(item => {
            let matches = item.match(TURN_RE);
            return {
                username: matches[2],
                credential: matches[3],
                urls: `turn:${matches[5]}`
            };
        });
    let iceServers = stunList.concat(turnList);
    logger.debug(`iceServers=${JSON.stringify(iceServers)}`);
    return iceServers;
}
