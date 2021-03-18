/*
 * Server JS containing  api calls
 * @author vtikoo
 */
import express from 'express';
import customEnv from 'custom-env';
import { ScrtConnector }  from './scrtConnector.mjs';

customEnv.env();
const app = express();
app.use(express.json());

app.get('/api/createVoiceCall', (req, res) => {
    console.log(`Trying to create voice call with query ${JSON.stringify(req.query)}`);
    ScrtConnector.createVoiceCall(req.query).then(response => {
        console.log(`Successfully created a voice call - ${response.data.voiceCallId}`);
        res.send(response.data);
    }).catch(err => {
        console.log(`Failed to create voice call - ${err}`);
        res.send({ success: false });
    });
});

app.post('/api/createTranscription', (req, res) => {
    ScrtConnector.createTranscription(req.body).then(response => {
        console.log(`Successfully created a transcription call - ${response.data.result}`);
        res.send({ success: true });
    }).catch(err => {
        console.log(`Failed to create transcription - ${err}`);
        res.send({ success: false });
    });
});

app.post('/api/updateVoiceCall', (req, res) => {
    ScrtConnector.createVoiceCallRecording(req.body).then(response => {
        console.log(`Successfully created a voice call recording - ${response.data}`);
        res.send({ success: true });
    }).catch(err => {
        console.log(`Failed to create voice call recording - ${err}`);
        console.log(JSON.stringify(err));
        res.send({ success: false });
    });
});

app.post('/api/configureTenantInfo', (req, res) => {
    try {
        const updateResult = ScrtConnector.configureTenantInfo(req.body);
        console.log(`TenantInfo configured : \n${updateResult}`);
        res.send({ success: true});
    } catch (exception) {
        console.log(`Exception configuring tenant info : \n ${JSON.stringify(exception)}`);
        res.send({ success: false });
    }
});

app.listen(process.env.SERVER_PORT, () => {
    console.log(`App listening to ${process.env.SERVER_PORT}.Press Ctrl+C to quit.`);
});