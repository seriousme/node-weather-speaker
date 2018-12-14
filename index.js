const Firestore = require("@google-cloud/firestore");
const PouchDB = require("pouchdb");
const db = new PouchDB("http://raspiw:5984/weatherdb");

const firestore = new Firestore({
  projectId: "weatherstation-540a8",
  keyFilename: `${__dirname}/.weatherStation-project.json`
});
const settings = { timestampsInSnapshots: true };
firestore.settings(settings);

const collection = firestore.collection("sensors");

function aggregate(data) {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let count = 0;
  data.rows.forEach(row => {
    if (row.value.min < min) min = row.value.min;
    if (row.value.max > max) max = row.value.max;
    sum += row.value.sum;
    count += row.value.count;
  });
  let avg = Number((sum / count).toFixed(1));
  return { max, min, avg };
}

async function getCurrentSensorData(id, type) {
  const d = new Date();
  d.setHours(d.getHours() - 12);
  let startparams = [
    id,
    type,
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
    d.getUTCHours()
  ];
  let endparams = [id, type, {}];

  try {
    const data = await db.query("data/byhour", {
      group_level: 6,
      startkey: startparams,
      endkey: endparams
    });
    return aggregate(data);
  } catch (error) {
    console.log(error);
  }
}

async function getLastUpdate(id, type) {
  // and the exact last one
  var endparams = [id, type, {}];
  const data = await db.query("data/byhour", {
    reduce: false,
    descending: true,
    limit: 1,
    startkey: endparams
  });
  return { current: data.rows[0].value, lastUpdate: data.rows[0].id };
}

async function replicateSensorData() {
  const result = {};
  for (let sensor of ["Buiten", "Kas"]) {
    result[sensor] = {};
    for (let type of ["temp", "humid"]) {
      result[sensor][type] = await getCurrentSensorData(sensor, type);
      const { current, lastUpdate } = await getLastUpdate(sensor, type);
      result[sensor][type].current = current;
      result[sensor][type].lastUpdate = lastUpdate;
    }
    console.log(result[sensor]);
    collection.doc(sensor).set(result[sensor]);
  }
}

replicateSensorData();
