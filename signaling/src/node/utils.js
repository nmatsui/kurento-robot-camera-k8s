import log4js from 'log4js';
const logger = log4js.getLogger('utils');
logger.level = process.env.LOG_LEVEL || 'debug';

export function getIceServers() {
    const STUN_LIST = process.env.STUN_LIST || '';
    const TURN_LIST = process.env.TURN_LIST || '';
    const TURN_RE = /^([^@:]+):([^@:]+)@(.+)$/;

    logger.debug(`STUN_LIST=${STUN_LIST}`);
    let stunList = STUN_LIST
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .map(item => {
            return {
                urls: item
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
                username: matches[1],
                credential: matches[2],
                urls: matches[3]
            };
        });
    return stunList.concat(turnList);
}
