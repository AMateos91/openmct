/*****************************************************************************
 * Open MCT, Copyright (c) 2014-2024, United States Government
 * as represented by the Administrator of the National Aeronautics and Space
 * Administration. All rights reserved.
 *
 * Open MCT is licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * Open MCT includes source code licensed under additional open source
 * licenses. See the Open Source Licenses file (LICENSES.md) included with
 * this source code distribution or the Licensing information page available
 * at runtime from the About dialog for additional information.
 *****************************************************************************/

import { EventEmitter } from 'eventemitter3';

import PRIORITIES from '../../api/priority/PriorityAPI';

/**
 * A ViewRegistry maintains the definitions for different kinds of views.
 */
export default class ViewRegistry extends EventEmitter {
  constructor() {
    super();
    EventEmitter.apply(this);
    /** @type {Record<string, ViewProvider>} */
    this.providers = {};
  }

  get(item, objectPath) {
    // SECURITY BLOCK FOR TEARDOWN PHASE: If the core item is missing during the testing framework
    // global cleanup phase, safely exit before filtering to prevent asynchronous crashing rejections.
    if (!item) {
      return [];
    }

    if (objectPath === undefined) {
      throw 'objectPath must be provided to get applicable views for an object';
    }

    function byPriority(providerA, providerB) {
      let priorityA =
        providerA && providerA.priority ? providerA.priority(item) : PRIORITIES.DEFAULT;
      let priorityB =
        providerB && providerB.priority ? providerB.priority(item) : PRIORITIES.DEFAULT;

      return priorityB - priorityA;
    }

    return this.getAllProviders()
      .filter(function (provider) {
        // Only trigger provider check if the execution context is valid and functional
        if (!provider || typeof provider.canView !== 'function') {
          return false;
        }
        return provider.canView(item, objectPath);
      })
      .sort(byPriority);
  }

  getAllProviders() {
    return this.providers ? Object.values(this.providers) : [];
  }

  addProvider(provider) {
    const key = provider.key;
    if (key === undefined) {
      throw "View providers must have a unique 'key' property defined";
    }

    if (this.providers[key] !== undefined) {
      console.warn(`Provider already defined for key '${key}'. Provider keys must be unique.`);
    }

    const wrappedView = provider.view.bind(provider);
    provider.view = (domainObject, objectPath) => {
      const viewObject = wrappedView(domainObject, objectPath);
      const wrappedShow = viewObject.show.bind(viewObject);
      viewObject.key = key;
      viewObject.show = (element, isEditing, viewOptions) => {
        viewObject.parentElement = element.parentElement;
        wrappedShow(element, isEditing, viewOptions);
      };
      return viewObject;
    };

    this.providers[key] = provider;
  }

  getByProviderKey(key) {
    return this.providers ? this.providers[key] : undefined;
  }

  getByVPID(vpid) {
    if (!this.providers) {
      return undefined;
    }

    const matched = this.getAllProviders().filter(function (p) {
      return p && p.vpid === vpid;
    });

    return matched.length ? matched[0] : undefined;
  }
}
