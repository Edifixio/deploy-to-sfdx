const logger = require('heroku-logger');

const exec = require('child-process-promise').exec;

const fs = require('fs');
const logResult = require('./logging');

module.exports = function () {
	// where will our cert live?
	let keypath;

	if (process.env.LOCAL_ONLY_KEY_PATH) {
		// I'm fairly local
		logger.debug('pool...loading local key');
		keypath = process.env.LOCAL_ONLY_KEY_PATH;
	} else {
		// we're doing it in the cloud
		logger.debug('pool...creating cloud key');
		fs.writeFileSync('/app/tmp/server.key', process.env.JWTKEY, 'utf8');
		keypath = '/app/tmp/server.key';
	}

	return new Promise((resolve, reject) => {
		logger.debug('updating plugin');
		exec('sfdx update')
			.catch((sfdxUpdateWarnings) => {
				logger.error(sfdxUpdateWarnings);
			})
			.then(() => {
				logger.debug('sfdx core plugin updated');
				return exec('echo y | sfdx plugins:install sfdx-msm-plugin');
			})
			.catch((msmError) => {
				logger.error(msmError);
				return { stdout: 'plugin already installed' };
			})
			.then(() => {
				logger.debug('msm plugin installed');
				return exec('heroku update');
			})
			.then((herokuResult) => {
				logger.debug(herokuResult);
				return exec('echo y | sfdx plugins:install shane-sfdx-plugins');
			})
			.catch((shaneError) => {
				logger.error(shaneError);
				return { stdout: 'plugin already installed' };
			})
			// auth to the hub
			.then((result) => {
				logger.debug('shane plugin installed');
				logResult(result);
				return exec(`sfdx force:auth:jwt:grant --clientid ${process.env.CONSUMERKEY} --username ${process.env.HUB_USERNAME} --jwtkeyfile ${keypath} --setdefaultdevhubusername -a deployBotHub`);
			})  // OK, we've got our environment prepared now.  Let's auth to our org and verify
			.then((result) => {
				logResult(result);
				return exec(`export HEROKU_API_KEY=${process.env.HEROKU_API_KEY}`);
			})
			.then(() => {
				logger.debug('heroku api key set');
				resolve(keypath);
			})
			.catch((err) => {
				reject(err);
			});


	});
};