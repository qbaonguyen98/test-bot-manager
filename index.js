const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

const CONCURRENT_NUMBER = 3;
const emitter = new EventEmitter();

// get all bot services
const bots = fs.readdirSync(path.resolve(__dirname, './bots'));
const botServices = bots.map(b => {
    return {
        name: b,
        func: (require(`./bots/${b}/bot.js`)).run,
    }
});

// this function run all bot services and resolve when done
const masterFunc = async () => {
    console.log('Bot manager started...');

    let runningBots = [];
    let botsToRun = JSON.parse(JSON.stringify(bots));
    let completedBots = [];

    emitter.on('bot_completed', (name) => {
        // add to completed list
        if (name) {
            completedBots.push(name);
        }

        // pop ut out of running list
        runningBots = runningBots.filter(n => n !== name);
        const runningBotTotal = runningBots.length;

        // add new bot to running list
        for (let i = 0; i < CONCURRENT_NUMBER - runningBotTotal; i++) {
            const botToRun = botsToRun.splice(0, 1)[0];

            if (botToRun) {
                runningBots.push(botToRun);

                const botService = botServices.find(s => s.name === botToRun);

                (async () => {
                    console.log(`Bot '${botToRun}' started...`);
                    await botService.func();
                    console.log(`Bot '${botToRun}' completed.`);
                    emitter.emit('bot_completed', botToRun);
                })();
            }
        }

        // check if all bots are done
        if (botsToRun.length === 0 && completedBots.length === bots.length) {
            emitter.emit('all_completed');
        }
    });

    emitter.emit('bot_completed');

    return new Promise((resolve, reject) => {
        emitter.on('all_completed', () => {
            console.log('Bot manager stopped: All bots complete running.');
            resolve();
        });
    });
};

masterFunc();
