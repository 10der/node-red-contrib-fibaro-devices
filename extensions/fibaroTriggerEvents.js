module.exports = function (RED) {
    "use strict";

    const selectn = require('selectn');

    // require any external libraries we may need....
    //var foo = require("foo-library");

    // The main node definition - most things happen in here
    function TriggerState(n) {
        // Create a RED node
        RED.nodes.createNode(this, n);

        var serverConfig = RED.nodes.getNode(n.server);
        var node = this;
        var fibaro = serverConfig.client;
        this.isenabled = true;
        this.nodeConfig = n;
        this.nodeConfig.hookProperty = this.nodeConfig.hookProperty || 'value';
        node.nodeConfig.entityid = node.nodeConfig.entityid.trim();

        node.status({});

        if (node.nodeConfig.entityid) {
            // query on startup
            if (node.nodeConfig.initOnStart) {
                fibaro.queryState(node.nodeConfig.entityid, node.nodeConfig.hookProperty, (currentState) => {
                    if (currentState) {
                        const evt = {
                            event_type: 'state_changed',
                            entity_id: node.nodeConfig.entityid,
                            event: {
                                property: node.nodeConfig.hookProperty,
                                entity_id: node.nodeConfig.entityid,
                                new_state: { state: currentState.value },
                                old_state: { state: null },
                            }
                        };
                        node.onEntityStateChanged(evt);
                    }
                }, (error) => node.status({ fill: "red", shape: "dot", text: error.text }));
            }
        }

        function processMessage(message) {
            if (message.topic == "DevicePropertyUpdatedEvent") {
                if (message.payload.property) {

                    if (node.nodeConfig.entityid) {
                        if (message.payload.id != node.nodeConfig.entityid) {
                            return
                        }
                    }

                    if (message.payload.property != node.nodeConfig.hookProperty) {
                        return;
                    }

                    // console.debug(message.payload);
                    let evt = {
                        event_type: 'state_changed',
                        entity_id: message.payload.id,
                        event: {
                            entity_id: message.payload.id,
                            new_state: { state: {} },
                            old_state: { state: {} },
                        }
                    };
                    evt.event.property = message.payload.property;
                    evt.event.new_state.state = message.payload.newValue;
                    evt.event.old_state.state = message.payload.oldValue;
                    evt.event[message.payload.property] = message.payload.newValue;
                    node.onEntityStateChanged(evt);
                }
            } else
                if (message.topic == "CentralSceneEvent") {
                    if (node.nodeConfig.entityid) {
                        if (message.payload.deviceId != node.nodeConfig.entityid) {
                            return
                        }
                    }

                    let evt = {
                        event_type: 'state_changed',
                        entity_id: message.payload.deviceId,
                        event: {
                            entity_id: message.payload.deviceId,
                            new_state: { state: {} },
                            old_state: { state: {} },
                        }
                    };
                    evt.event.property = "CentralSceneEvent";
                    evt.event.new_state.state = message.payload;
                    Object.keys(message.payload).forEach(function (key) {
                        evt.event[key] = message.payload[key];
                    });
                    node.onEntityStateChanged(evt);
                }
        }

        fibaro.on('events', function (message) {
            processMessage(message);
        });

        this.on('input', function (message) {
            if (message === 'enable' || message.payload === 'enable') {
                this.isenabled = true;
            }
            if (message === 'disable' || message.payload === 'disable') {
                this.isenabled = false;
            }

            if (this.isenabled) {
                node.status({ fill: 'greed', shape: 'ring', text: 'enabled' });
            } else {
                node.status({ fill: 'red', shape: 'ring', text: 'disabled' });
            }

            processMessage(message);
        });

        this.on("close", function () {
            // TODO
        });

        TriggerState.prototype.onEntityStateChanged = async function (eventMessage) {
            if (this.isenabled === false) {
                this.debugToClient('incoming: node is currently disabled, ignoring received event');
                return;
            }

            try {
                const constraintComparatorResults = await this.getConstraintComparatorResults(this.nodeConfig.constraints, eventMessage);
                let outputs = this.getDefaultMessageOutputs(constraintComparatorResults, eventMessage);

                // If a constraint comparator failed we're done, also if no custom outputs to look at
                if (constraintComparatorResults.failed.length || !this.nodeConfig.customoutputs.length) {
                    this.debugToClient('done processing sending messages: ', outputs);
                    return this.send(outputs);
                }

                const customOutputsComparatorResults = await this.getCustomOutputsComparatorResults(this.nodeConfig.customoutputs, eventMessage);
                const customOutputMessages = customOutputsComparatorResults.map(r => r.message);

                outputs = outputs.concat(customOutputMessages);
                this.debugToClient('done processing sending messages: ', outputs);
                this.send(outputs);
            } catch (e) {
                this.error(e);
            }
        }

        TriggerState.prototype.getConstraintComparatorResults = async function (constraints, eventMessage) {
            const comparatorResults = [];

            // Check constraints
            for (let constraint of constraints) {
                const { comparatorType, comparatorValue, comparatorValueDatatype, propertyValue } = constraint;
                if (propertyValue) {
                    //  
                }
                const constraintTarget = await this.getConstraintTargetData(constraint, eventMessage.event);
                const actualValue = reach(constraint.propertyValue, constraintTarget.state);
                const comparatorResult = this.getComparatorResult(comparatorType, comparatorValue, actualValue, comparatorValueDatatype);

                if (comparatorResult === false) {
                    this.debugToClient(`constraint comparator: failed entity "${constraintTarget.entityid}" property "${propertyValue}" with value ${actualValue} failed "${comparatorType}" check against (${comparatorValueDatatype}) ${comparatorValue}`); // eslint-disable-line
                }

                comparatorResults.push({ constraint, constraintTarget, actualValue, comparatorResult });
            }
            const failedComparators = comparatorResults.filter(res => !res.comparatorResult);
            return { all: comparatorResults || [], failed: failedComparators || [] };
        }

        TriggerState.prototype.getDefaultMessageOutputs = function (comparatorResults, eventMessage) {
            const { entity_id, event } = eventMessage;

            const msg = { topic: entity_id, payload: event.new_state.state, data: eventMessage };
            let outputs;

            if (comparatorResults.failed.length) {
                this.debugToClient('constraint comparator: one more more comparators failed to match constraints, message will send on the failed output');

                msg.failedComparators = comparatorResults.failed;
                outputs = [null, msg];
            } else {
                outputs = [msg, null];
            }
            return outputs;
        }

        TriggerState.prototype.getCustomOutputsComparatorResults = async function (outputs, eventMessage) {
            const outputResults = [];
            for (let output of outputs) {
                let result = { output, comparatorMatched: true, actualValue: null, message: null };
                let event = eventMessage.event;

                if (output.comparatorPropertyType !== 'always') {
                    if (output.comparatorPropertyType == "property") {
                        const state = await fibaro.queryStateAsync(eventMessage.entity_id, output.comparatorPropertyValue);
                        event[output.comparatorPropertyValue] = state.value;
                    }
                    result.actualValue = reach(output.comparatorPropertyValue, event);
                    result.comparatorMatched = this.getComparatorResult(output.comparatorType, output.comparatorValue, result.actualValue, output.comparatorValueDatatype);
                }
                result.message = this.getOutputMessage(result, eventMessage);
                outputResults.push(result);
            }
            return outputResults;
        }

        TriggerState.prototype.getConstraintTargetData = async function (constraint, triggerEvent) {
            let targetData = { entityid: null, state: null };
            try {
                const isTargetThisEntity = constraint.targetType === 'this_entity';
                targetData.entityid = (isTargetThisEntity) ? this.nodeConfig.entityid : constraint.targetValue;

                // TODO: Non 'self' targets state is just new_state of an incoming event, wrap to hack around the fact
                // NOTE: UI needs changing to handle this there, and also to hide "previous state" if target is not self

                if (isTargetThisEntity) {
                    targetData.state = triggerEvent;
                    if (constraint.propertyType == "property") {
                        var currentvalue = triggerEvent.new_state.state[constraint.propertyValue];
                        if (currentvalue === undefined) {
                            let propertyName = constraint.propertyValue;
                            const state = await fibaro.queryStateAsync(targetData.entityid, propertyName);
                            targetData.state = {};
                            targetData.state[propertyName] = state.value;
                        } else {
                            targetData.state = triggerEvent.new_state.state;
                        }
                    }
                } else {
                    let propertyName = "value";
                    if (constraint.propertyType == "property") {
                        propertyName = constraint.propertyValue;
                    }
                    const state = await fibaro.queryStateAsync(targetData.entityid, propertyName);
                    if (constraint.propertyType == "property") {
                        targetData.state = {};
                        targetData.state[propertyName] = state.value;
                    } else {
                        targetData.state = {
                            new_state: { state: state.value }
                        };
                    }
                }

            } catch (e) {
                this.debug('Error during trigger:state comparator evalutation: ', e.stack);
                throw e;
            }

            return targetData;
        }

        /* eslint-disable indent */
        function getCastValue(datatype, value) {
            if (!datatype) return value;

            switch (datatype) {
                case 'num': return parseFloat(value);
                case 'str': return value + '';
                case 'bool': return (value === 'true');
                case 're': return new RegExp(value);
                case 'list': return value.split(',');
                default: return value;
            }
        }

        /* eslint-disable indent */
        TriggerState.prototype.getComparatorResult = function (comparatorType, comparatorValue, actualValue, comparatorValueDatatype) {
            const cValue = getCastValue(comparatorValueDatatype, comparatorValue);

            switch (comparatorType) {
                case 'is':
                case 'is_not': {
                    // Datatype might be num, bool, str, re (regular expression)
                    const isMatch = (comparatorValueDatatype === 're') ? cValue.test(actualValue) : (cValue === actualValue);
                    return (comparatorType === 'is') ? isMatch : !isMatch;
                }
                case 'includes':
                case 'does_not_include': {
                    const isIncluded = cValue.includes(actualValue);
                    return (comparatorType === 'includes') ? isIncluded : !isIncluded;
                }
                case 'greater_than':
                    return actualValue > cValue;
                case 'less_than':
                    return actualValue < cValue;
            }
        }

        // Hack to get around the fact that node-red only sends warn / error to the debug tab
        TriggerState.prototype.debugToClient = function (debugMsg) {
            if (!this.nodeConfig.debugenabled) return;
            if (!debugMsg) return;
            for (let msg of arguments) {
                const debugMsgObj = {
                    id: this.id,
                    name: this.name || '',
                    msg
                };
                RED.comms.publish('debug', debugMsgObj);
            }
        }

        TriggerState.prototype.getOutputMessage = function ({ output, comparatorMatched, actualValue }, eventMessage) {
            if (actualValue) {
                //
            }
            // If comparator did not match
            if (!comparatorMatched) {
                this.debugToClient(`output comparator failed: property "${output.comparatorPropertyValue}" with value ${actualValue} failed "${output.comparatorType}" check against ${output.comparatorValue}`); // eslint-disable-line
                return null;
            }

            if (output.messageType === 'default') {
                return { topic: eventMessage.entity_id, payload: eventMessage.event.new_state.state, data: eventMessage };
            }

            try {
                return JSON.parse(output.messageValue);
            } catch (e) {
                return output.messageValue;
            }
        }

        function reach(path, obj) {
            return selectn(path, obj);
        }

    }

    // Register the node by name. This must be called before overriding any of the
    // Node functions.
    RED.nodes.registerType("trigger-event", TriggerState);
}
