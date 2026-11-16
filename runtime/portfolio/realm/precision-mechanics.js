import * as T from '../../about/vendor/three.module.js';

const tau = 2 * Math.PI;

function gear(radius, teeth, thickness, bore = .32) {
  const shape = new T.Shape();
  for (let tooth = 0; tooth < teeth; tooth++) {
    for (const [fraction, rim] of [[0, .89], [.23, 1], [.67, 1], [.88, .89]]) {
      const angle = (tooth + fraction) / teeth * tau;
      const x = Math.cos(angle) * radius * rim;
      const y = Math.sin(angle) * radius * rim;
      if (tooth === 0 && fraction === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
  }
  shape.closePath();
  const hole = new T.Path();
  hole.absarc(0, 0, radius * bore, 0, tau, true);
  shape.holes.push(hole);
  const bevel = Math.min(.022, thickness * .24);
  return new T.ExtrudeGeometry(shape, {
    depth: thickness, steps: 1, curveSegments: 16,
    bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1,
  }).rotateX(-Math.PI / 2);
}

function vernier(parent, radius, height, count, material) {
  const marks = new T.InstancedMesh(new T.BoxGeometry(.035, .035, .19), material, count);
  const mark = new T.Object3D();
  for (let i = 0; i < count; i++) {
    const angle = i / count * tau;
    mark.position.set(Math.sin(angle) * radius, height, Math.cos(angle) * radius);
    mark.rotation.y = angle;
    mark.scale.z = i % 5 ? .55 : 1.2;
    mark.updateMatrix();
    marks.setMatrixAt(i, mark.matrix);
  }
  marks.computeBoundingSphere();
  parent.add(marks);
}

export function addArmillaryMechanics(kit, spin, rings) {
  const { mesh, annulus } = kit.builders;
  const { bronze, steel, gold } = kit.materials;
  const carrier = new T.Group();
  carrier.position.y = .55;
  spin.add(carrier);
  const sun = mesh(spin, gear(.98, 28, .17, .7), gold, 0, .55);
  const planetGeometry = gear(.58, 16, .15);
  const planets = Array.from({ length: 3 }, (_, i) => {
    const angle = i / 3 * tau;
    const planet = mesh(carrier, planetGeometry, steel, Math.sin(angle) * 1.49, 0, Math.cos(angle) * 1.49);
    mesh(carrier, new T.CylinderGeometry(.087, .087, .28, 12), bronze, planet.position.x, .12, planet.position.z);
    return planet;
  });
  annulus(carrier, 2.06, 2.2, .13, bronze);
  vernier(rings[0].group, 2.1, .37, 72, gold);
  vernier(rings.at(-1).group, 5.75, .41, 100, gold);

  const alidade = new T.Group();
  const shaft = mesh(alidade, new T.CylinderGeometry(.055, .08, 8.75, 12), bronze, 0, .55);
  shaft.rotation.z = Math.PI / 2;
  for (const side of [-1, 1]) {
    const sight = mesh(alidade, new T.TorusGeometry(.24, .055, 8, 28), gold, side * 4.15, .69);
    sight.rotation.y = Math.PI / 2;
    mesh(alidade, new T.CylinderGeometry(.04, .055, .36, 10), steel, side * 4.15, .69);
  }
  rings[3].group.add(alidade);

  const solid = new T.IcosahedronGeometry(1.57);
  const edges = new T.EdgesGeometry(solid);
  const vertices = edges.getAttribute('position');
  const cage = new T.InstancedMesh(new T.CylinderGeometry(.027, .027, 1, 6), steel, vertices.count / 2);
  const start = new T.Vector3(), end = new T.Vector3(), direction = new T.Vector3();
  const strut = new T.Object3D(), up = new T.Vector3(0, 1, 0);
  for (let i = 0; i < cage.count; i++) {
    start.fromBufferAttribute(vertices, 2 * i);
    end.fromBufferAttribute(vertices, 2 * i + 1);
    strut.position.copy(start).lerp(end, .5);
    direction.subVectors(end, start);
    strut.scale.y = direction.length();
    strut.quaternion.setFromUnitVectors(up, direction.normalize());
    strut.updateMatrix();
    cage.setMatrixAt(i, strut.matrix);
  }
  cage.computeBoundingSphere();
  solid.dispose();
  edges.dispose();
  spin.add(cage);
  return (time, formation, explode) => {
    carrier.rotation.y = time * .29;
    carrier.position.y = .55 + explode * .45 - (1 - formation) * .35;
    sun.rotation.y = -time * .48;
    planets.forEach((planet, i) => { planet.rotation.y = time * 1.42 + i * 2.1; });
    alidade.rotation.y = time * .19;
    cage.rotation.set(time * .08, -time * .12, .15);
  };
}

export function addMonumentMechanics(kit, irisBlades) {
  const { argus, nexus, twins } = kit.models;
  const { mesh, annulus, rim } = kit.builders;
  const { bronze, steel, gold, stone, black } = kit.materials;
  const oculus = new T.Group();
  oculus.position.y = 3.25;
  const iris = irisBlades[0].parent;
  const lens = argus.spin.children.find(part => part.material?.isMeshPhysicalMaterial);
  oculus.add(iris);
  if (lens) oculus.add(lens);
  const irisScale = new T.Group();
  vernier(irisScale, 3.18, .55, 72, gold);
  annulus(oculus, 2.4, 3.2, .42, bronze);
  oculus.add(irisScale);
  argus.spin.add(oculus);
  const suspension = [0, 1, 2].map(axis => {
    const gimbal = new T.Group();
    gimbal.position.y = 3.25;
    rim(gimbal, 3.3 + axis * .36, 0, axis % 2 ? steel : bronze);
    rim(gimbal, 3.38 + axis * .36, 0, gold);
    argus.spin.add(gimbal);
    return gimbal;
  });
  const pier = new T.CylinderGeometry(.28, .7, 3.5, 10);
  for (const x of [-3, 3]) mesh(argus.spin, pier, stone, x, 1.7, 0);
  const hub = mesh(nexus.spin, gear(1.29, 28, .16), gold, 0, .61);
  const pinionGeometry = gear(.78, 18, .17);
  const nodeRings = kit.satellites.map(node => {
    const gimbal = new T.Group();
    gimbal.position.y = 1.65;
    rim(gimbal, 1.45, 0, steel);
    rim(gimbal, 1.49, 0, gold);
    const meridian = new T.Group();
    meridian.rotation.x = Math.PI / 2;
    rim(meridian, 1.28, 0, bronze);
    gimbal.add(meridian);
    mesh(gimbal, new T.SphereGeometry(.39, 20, 12), gold);
    mesh(node.spin, new T.CylinderGeometry(.1, .34, 1.52, 10), steel, 0, .76);
    mesh(node.spin, pinionGeometry, bronze, 0, .43);
    node.spin.add(gimbal);
    return gimbal;
  });

  const rotorGeometry = gear(1.48, 32, .12);
  const towerProfile = new T.LatheGeometry([
    [0,0],[1.23,0],[1.23,.24],[.92,.44],[.78,3.4],[.95,3.5],
    [.95,3.85],[.67,4],[.67,4.23],[.83,4.28],[.13,6.12],[0,6.35],
  ].map(([radius, height]) => new T.Vector2(radius, height)), 8);
  const lancetShape = new T.Shape();
  lancetShape.moveTo(-.19, 0);
  lancetShape.lineTo(.19, 0);
  lancetShape.lineTo(.19, 1.14);
  lancetShape.quadraticCurveTo(.16, 1.34, 0, 1.53);
  lancetShape.quadraticCurveTo(-.16, 1.34, -.19, 1.14);
  lancetShape.closePath();
  const lancet = new T.ShapeGeometry(lancetShape, 8);
  const rotors = twins.spin.children.filter(node => node.isGroup).slice(0, 2).map(node => {
    mesh(node, towerProfile, stone, 0, .7);
    for (const [radius, height] of [[1.25,.95],[.95,4.24],[.85,4.99]]) rim(node, radius, height, bronze);
    for (let face = 0; face < 8; face++) {
      const angle = (face + .5) / 8 * tau;
      const window = mesh(node, lancet, black, Math.sin(angle) * .84, 1.92, Math.cos(angle) * .84);
      window.rotation.y = angle;
    }
    mesh(node, new T.OctahedronGeometry(.18), gold, 0, 7.06);
    const rotor = new T.Group();
    rotor.position.y = .62;
    mesh(rotor, rotorGeometry, steel);
    annulus(rotor, .27, .64, .29, bronze);
    const fins = new T.InstancedMesh(new T.BoxGeometry(.16, .12, .76), gold, 16);
    const fin = new T.Object3D();
    for (let i = 0; i < fins.count; i++) {
      const angle = i / fins.count * tau;
      fin.position.set(Math.sin(angle) * .89, .15, Math.cos(angle) * .89);
      fin.rotation.set(0, angle + .33, .2);
      fin.updateMatrix();
      fins.setMatrixAt(i, fin.matrix);
    }
    fins.computeBoundingSphere();
    rotor.add(fins);
    node.add(rotor);
    return rotor;
  });

  return (id, time, formation, explode) => {
    if (id === 'argus') {
      const open = formation * (.75 + Math.sin(time * .8) * .15) + explode * .25;
      oculus.rotation.set(.64 + Math.sin(time * .26) * .22, time * .18, explode * .38);
      suspension.forEach((gimbal, axis) => {
        gimbal.rotation.set(.24 + axis * .64 + time * (.12 + axis * .04), -time * .24 + axis, time * .12 * (axis - 1));
      });
      irisScale.rotation.y = -time * .19;
      irisBlades.forEach((blade, i) => {
        const angle = i / 12 * tau;
        const radius = 1.22 + open * .66;
        blade.position.set(Math.sin(angle) * radius, .47 + i * .006, Math.cos(angle) * radius);
        blade.rotation.y = -angle + .5 + open * .85;
      });
    } else if (id === 'nexus') {
      hub.rotation.y = time * .9;
      nodeRings.forEach((ring, i) => ring.rotation.set(.38 + explode * .7, -time * .35 + i * tau / 3, time * .29));
    } else if (id === 'twins') {
      rotors.forEach((rotor, i) => { rotor.rotation.y = time * (i ? -.94 : .94); });
    }
  };
}
