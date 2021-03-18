import { initializeConnector } from 'scv-connector-base';
import { Connector } from './connector';
import { initializeRemoteController } from '../remote-control/index'

const connector = new Connector();
window.addEventListener('load', () => {
    initializeConnector(connector);
    initializeRemoteController(connector);
});
