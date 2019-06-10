"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const logger = require("heroku-logger");
const amIlocal_1 = require("./amIlocal");
const execProm_1 = require("../lib/execProm");
const getKeypath = async () => {
    if (amIlocal_1.isLocal()) {
        logger.debug('hubAuth...using local key');
        if (process.env.LOCAL_ONLY_KEY_PATH) {
            return process.env.LOCAL_ONLY_KEY_PATH;
        }
        else {
            logger.error(`isLocal, but no local keypath. ${process.env.LOCAL_ONLY_KEY_PATH}`);
        }
    }
    else {
        logger.debug('hubAuth...using key from heroku environment');
        if (!fs.existsSync('/app/tmp/server.key')) {
            fs.writeFileSync('/app/tmp/server.key', process.env.JWTKEY, 'utf8');
        }
        return '/app/tmp/server.key';
    }
};
exports.getKeypath = getKeypath;
const auth = async () => {
    const keypath = await getKeypath();
    try {
        if (!amIlocal_1.isLocal()) {
            logger.debug('hubAuth: updating plugin');
            await execProm_1.exec('sfdx plugins:link node_modules/shane-sfdx-plugins');
        }
        if (process.env.SFDX_PRERELEASE) {
            logger.debug('hubAuth: installing pre-release plugin for sfdx');
            await execProm_1.exec('sfdx plugins:install salesforcedx@pre-release');
        }
        if (process.env.HEROKU_API_KEY) {
            await execProm_1.exec('heroku update');
        }
        await execProm_1.exec(`sfdx force:auth:jwt:grant --clientid ${process.env.CONSUMERKEY} --username ${process.env.HUB_USERNAME} --jwtkeyfile ${await keypath} --setdefaultdevhubusername -a hub --json`);
    }
    catch (err) {
        logger.error('hubAuth', err);
        process.exit(1);
    }
    logger.debug('hubAuth: complete');
    return keypath;
};
exports.auth = auth;
