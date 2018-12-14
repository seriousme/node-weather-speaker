const functions = require("firebase-functions");
const admin = require("firebase-admin");

const { dialogflow } = require("actions-on-google");
const app = dialogflow();

admin.initializeApp(functions.config().firebase);
const firestore = admin.firestore();
firestore.settings({ timestampsInSnapshots: true });
const db = firestore.collection("sensors");

const sensorTxt = {
  Buiten: "Buiten",
  Kas: "In de kas"
};

const MAXLAG = 30 * 60 * 1000; //30 mins

function getSensorData(sensor) {
  return new Promise((resolve, reject) => {
    db.doc(sensor)
      .get()
      .then(doc => {
        if (doc.exists) {
          const data = doc.data();
          data.sensor = sensor;
          resolve(data);
        } else {
          reject(`Can't find ${sensor} in the database`);
        }
      });
  });
}

function nowToSpeech(data) {
  if (data && isCurrent(data.temp.lastUpdate)) {
    return `${sensorTxt[data.sensor]} is het op dit moment ${
      data.temp.current
    } graden.`;
  } else {
    return `Er is nu geen informatie van de "${
      data.sensor
    }" sensor beschikbaar.`;
  }
}

function pastToSpeech(data) {
  if (data && isCurrent(data.temp.lastUpdate)) {
    return `${sensorTxt[data.sensor]} was het minimum ${
      data.temp.min
    } graden en het maximum ${data.temp.max} graden tijdens de laatste 12 uur.`;
  } else {
    return `Er is nu geen recente informatie van de "${
      data.sensor
    }" sensor beschikbaar.`;
  }
}

function isCurrent(time) {
  const now = new Date();
  const date = new Date(time);
  return now - date < MAXLAG;
}

app.intent("speakSensorNow", (conv, params) => {
  const { sensor } = params;
  return getSensorData(sensor).then(data => {
    conv.close(nowToSpeech(data));
  });
});

app.intent("speakSensorPast", (conv, params) => {
  const { sensor } = params;
  return getSensorData(sensor).then(data => {
    conv.close(pastToSpeech(data));
  });
});

app.intent("speakAllSensors", (conv, params) => {
  return Promise.all([getSensorData("Buiten"), getSensorData("Kas")])
    .then(data => {
      let speech = `${nowToSpeech(data[0])} ${nowToSpeech(data[1])}`;
      conv.close(speech);
    })
    .catch(err => {
      console.log(`speakAllSensors failed: ${err}`);
      conv.close("we hebben even een technische storing!");
    });
});

exports.weatherSpeaker = functions.https.onRequest(app);
