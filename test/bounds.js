import { NodeIO } from '@gltf-transform/core';
import { bounds } from '@gltf-transform/core';
import fs from 'fs';

// Oh wait, bounds is not from @gltf-transform/core. It is @gltf-transform/functions
// But earlier that failed with no export 'bounds' in @gltf-transform/functions.
// Let's just compute Box3 manually by iterating over nodes and accessors.
