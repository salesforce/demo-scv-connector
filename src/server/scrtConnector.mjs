/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/*
 * SCRT2 connection utility
 * @author vtikoo
 */
import JWT from 'jsonwebtoken';
import customEnv from 'custom-env';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

customEnv.env();

const tenantInfo = {
    scrtBaseUrl: '',
    orgId: '',
    callCenterName: ''
};

const getScrtUrl = (info) => {
    const telephonyApiPostfix = 'telephony/v1';
    return info.scrtBaseUrl + "/" + telephonyApiPostfix;
};

const getAxiosClient = (info) => { 
    return axios.create({ baseURL: getScrtUrl(info) });
}

let vendorCallKey = '';
let voiceCallId = '';

const getToken = () => {
    const privateKey = fs.readFileSync(path.resolve() + '/src/server/private.key');
    const signOptions = {
        issuer: tenantInfo.orgId,
        subject: tenantInfo.callCenterName,
        expiresIn: '4h',
        algorithm: 'RS256'
    };
    return JWT.sign({}, privateKey, signOptions);
};

export const ScrtConnector = {
    configureTenantInfo(params) {
        tenantInfo.scrtBaseUrl = params.scrtBaseUrl;
        tenantInfo.orgId = params.orgId;
        tenantInfo.callCenterName = params.callCenterName;

        let updateResult = '';
        Object.keys(tenantInfo).forEach( key => {
            updateResult = updateResult + `${key} : ${tenantInfo[key]}\n`;
        });
        return updateResult;
    },

    createVoiceCall(params) {
        const mockedVoiceCall = process.env.OVERRIDE_VOICECALLID;
        if (mockedVoiceCall) {
            return Promise.resolve({
                data: { voiceCallId: mockedVoiceCall }
            });
        }
        vendorCallKey = Math.random().toString(36).substring(7);
        const fieldValues = {
            callCenterApiName: tenantInfo.callCenterName,
            initiationMethod: params.type === "inbound" ? "Inbound" : params.type,
            vendorCallKey,
            to: process.env.CALL_CENTER_NO,
            from: params.caller,
            startTime: new Date().toISOString(),
            participants: [{
                participantKey: params.caller,
                type: "END_USER"
            }]
        };
        const headers = {
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            }
        };
        return getAxiosClient(tenantInfo).post('/voiceCalls', fieldValues, headers).then(response => {
            voiceCallId = response.data.voiceCallId;
            response.data.vendorCallKey = vendorCallKey;
            return response;
        });
    },
    createTranscription(params) {
        const startTime = Math.ceil(new Date().getTime() / 1000);
        const endTime = Math.ceil(new Date().getTime() / 1000) + 25;
        const headers = {
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            }
        };
        let participantId = '';
        vendorCallKey = params.vendorCallKey ? params.vendorCallKey : vendorCallKey;

        switch(params.senderType) {
            case 'END_USER':
                participantId = params.phoneNumber;
                break;
            case 'VIRTUAL_AGENT':
                participantId = vendorCallKey;
                break;
        }
        const fieldValues = {
            messageId: params.messageId,
            content: params.content,
            senderType: params.senderType,
            startTime,
            endTime,
            participantId
        };
        return vendorCallKey && participantId ?
            getAxiosClient(tenantInfo).post(`/voiceCalls/${vendorCallKey}/messages`, fieldValues, headers) :
            Promise.reject('No active call');
    },
    createVoiceCallRecording(params) {
        const fieldValues = {
            recordingLocation : params.recordingUrl,
            agentInteractionDuration : params.agentInteractionDuration,
            totalHoldDuration : params.totalHoldDuration
        };
        voiceCallId = params.voiceCallId ? params.voiceCallId : voiceCallId;
        const headers = {
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            }
        };
        return voiceCallId ?
            getAxiosClient(tenantInfo).patch(`/voiceCalls/${voiceCallId}`, fieldValues, headers) :
            Promise.reject('No active call');
    }
};