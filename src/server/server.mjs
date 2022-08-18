/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/*
 * JS Server serving api calls and socket signaling 
 * @author vtikoo, dlouvton
 */
import express from 'express';
import customEnv from 'custom-env';
import { ScrtConnector }  from './scrtConnector.mjs';
import { Server } from 'socket.io';
customEnv.env();
const app = express();
app.use(express.json());
let onlineUsers = new Map(); // username -> socket.id 
const server = app.listen(process.env.SERVER_PORT, () => {
    console.log(`App listening to ${process.env.SERVER_PORT}. Press Ctrl+C to quit.`);
});
const io = new Server(server);
io.on('connection', socket => {
    socket.on('join', data => {
        console.log('User joined: ' + data.username);
        socket.join(data.username);
    });

    socket.on('disconnect', () => {
        for (let [key, value] of onlineUsers.entries()) {
            if (value === socket.id) {
                console.log('User disconnected: ' + key);
                onlineUsers.delete(key);
            }
        }
        socket.broadcast.emit('onlineUsers', Array.from(onlineUsers.keys()));
    });

    socket.on('presence', data => {
        if (data.isAvailable) {
            onlineUsers.set(data.username, socket.id);
        } else {
            console.log('User went offline: ' + data.username);
            onlineUsers.delete(data.username)
        }
        socket.broadcast.emit('onlineUsers', Array.from(onlineUsers.keys()));
    });
    
    socket.on('message', data => {
        console.log(`User message from ${data.fromUsername} to ${data.toUsername}:  ${data.messageType}`);
        if (data.toUsername) {
            io.sockets.to(data.toUsername).emit('message', data);
        } else {
            socket.broadcast.emit('message', data);
        }
        
    });
});

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
    ScrtConnector.updateVoiceCall(req.body).then(response => {
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

app.post('/api/executeOmniFlow', (req, res) => {
    ScrtConnector.executeOmniFlow(req.body).then(result => {
        console.log(`Omni Flow executed successfully : ${JSON.stringify(result.data)}`);
        res.send(result.data);
    }).catch((err) => {
        console.log(`Failed to execute Omni Flow : \n ${JSON.stringify(err)}`);
        res.send({});
    });
});

app.post('/api/sendVoiceMail', (req, res) => {
    ScrtConnector.sendVoiceMail(req.body).then(result => {
        console.log(`Voice Mail sent successfully`);
        res.send(result.data);
    }).catch((err) => {
        console.log(`Failed to send Voice Mail : \n ${JSON.stringify(err)}`);
        res.send({});
    });
});

