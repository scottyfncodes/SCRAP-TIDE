// The player's little captain: animated walk, sit, dig and cheer poses.
import * as THREE from 'three';
import { paint, xf, merge, vcMat } from '../world/materials';

export class Captain {
  root = new THREE.Group();
  private body = new THREE.Group();
  private legL: THREE.Object3D;
  private legR: THREE.Object3D;
  private armL: THREE.Object3D;
  private armR: THREE.Object3D;
  private shovel: THREE.Object3D;
  private head: THREE.Object3D;
  pose: 'idle' | 'walk' | 'sit' | 'dig' | 'cheer' = 'idle';
  private phase = 0;
  private digT = 0;

  constructor() {
    const mat = vcMat();
    const limb = (len: number, color: string, w = 0.13) => {
      const g = new THREE.Group();
      const m = new THREE.Mesh(merge([paint(xf(new THREE.CapsuleGeometry(w, len, 3, 6), 0, -len / 2 - w * 0.5, 0), color)]), mat);
      m.castShadow = true;
      g.add(m);
      return g;
    };
    // torso: striped shirt
    const torsoParts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 4; i++) torsoParts.push(paint(xf(new THREE.CylinderGeometry(0.34 - i * 0.015, 0.36 - i * 0.015, 0.16, 12), 0, 0.82 + i * 0.16, 0), i % 2 ? '#3e8c80' : '#2e5872'));
    torsoParts.push(paint(xf(new THREE.CylinderGeometry(0.37, 0.37, 0.1, 12), 0, 0.72, 0), '#3a4148')); // belt
    torsoParts.push(paint(xf(new THREE.BoxGeometry(0.16, 0.12, 0.06), 0, 0.72, 0.36), '#f2b825')); // buckle
    const torso = new THREE.Mesh(merge(torsoParts), mat);
    torso.castShadow = true;
    this.body.add(torso);

    // head with bandana + tricorn
    const head = new THREE.Group();
    const hp: THREE.BufferGeometry[] = [];
    hp.push(paint(xf(new THREE.SphereGeometry(0.34, 14, 10), 0, 0, 0), '#e8b896'));
    hp.push(paint(xf(new THREE.SphereGeometry(0.055, 6, 4), -0.12, 0.04, 0.31), '#1a1a1a'));
    hp.push(paint(xf(new THREE.SphereGeometry(0.055, 6, 4), 0.12, 0.04, 0.31), '#1a1a1a'));
    hp.push(paint(xf(new THREE.SphereGeometry(0.06, 6, 4), 0, -0.05, 0.34), '#d99a7a'));
    hp.push(paint(xf(new THREE.TorusGeometry(0.08, 0.018, 4, 8, Math.PI), 0, -0.12, 0.3, 0, 0, Math.PI), '#7a3a2a'));
    hp.push(paint(xf(new THREE.SphereGeometry(0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), 0, 0.03, 0), '#e8742a')); // bandana
    // weathered wide-brim sun hat with salvage goggles on the band
    hp.push(paint(xf(new THREE.CylinderGeometry(0.62, 0.66, 0.05, 14), 0, 0.27, 0), '#c9a97a'));
    hp.push(paint(xf(new THREE.CylinderGeometry(0.27, 0.33, 0.26, 12), 0, 0.41, 0), '#b8956a'));
    hp.push(paint(xf(new THREE.TorusGeometry(0.315, 0.035, 4, 14), 0, 0.31, 0, Math.PI / 2, 0, 0), '#3a4148'));
    for (const gx of [-0.11, 0.11]) hp.push(paint(xf(new THREE.CylinderGeometry(0.085, 0.085, 0.07, 10), gx, 0.36, 0.3, Math.PI / 2, 0, 0), '#7fe3d6'));
    const hm = new THREE.Mesh(merge(hp), mat);
    hm.castShadow = true;
    head.add(hm);
    head.position.y = 1.72;
    this.head = head;
    this.body.add(head);

    this.legL = limb(0.42, '#46525f', 0.12);
    this.legR = limb(0.42, '#46525f', 0.12);
    this.legL.position.set(-0.15, 0.72, 0);
    this.legR.position.set(0.15, 0.72, 0);
    // boots
    for (const leg of [this.legL, this.legR]) {
      const boot = new THREE.Mesh(merge([paint(xf(new THREE.BoxGeometry(0.22, 0.16, 0.34), 0, -0.68, 0.05), '#2b1d14')]), mat);
      leg.add(boot);
    }
    this.armL = limb(0.42, '#e8b896', 0.1);
    this.armR = limb(0.42, '#e8b896', 0.1);
    this.armL.position.set(-0.44, 1.38, 0);
    this.armR.position.set(0.44, 1.38, 0);
    this.body.add(this.legL, this.legR, this.armL, this.armR);

    const sh = new THREE.Group();
    const shm = new THREE.Mesh(
      merge([
        paint(xf(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 5), 0, -0.3, 0.2, 0.3, 0, 0), '#8a5a34'),
        paint(xf(new THREE.BoxGeometry(0.26, 0.32, 0.03), 0, -0.85, 0.36, 0.3, 0, 0), '#9aa3ad'),
      ]),
      mat
    );
    sh.add(shm);
    sh.visible = false;
    this.armR.add(sh);
    this.shovel = sh;

    this.root.add(this.body);
    this.root.scale.setScalar(0.9);
  }

  dig() {
    this.digT = 0.7;
    this.pose = 'dig';
  }

  update(dt: number, speed: number) {
    this.phase += dt * (4 + speed * 2.2);
    const s = Math.sin(this.phase);
    this.shovel.visible = this.pose === 'dig';
    this.body.position.y = 0;
    this.body.rotation.x = 0;
    this.legL.rotation.x = this.legR.rotation.x = 0;
    this.armL.rotation.set(0, 0, 0.15);
    this.armR.rotation.set(0, 0, -0.15);
    this.head.rotation.set(0, 0, 0);
    switch (this.pose) {
      case 'walk':
        this.legL.rotation.x = s * 0.7;
        this.legR.rotation.x = -s * 0.7;
        this.armL.rotation.x = -s * 0.6;
        this.armR.rotation.x = s * 0.6;
        this.body.position.y = Math.abs(Math.cos(this.phase)) * 0.08;
        break;
      case 'sit':
        this.legL.rotation.x = this.legR.rotation.x = -1.35;
        this.body.position.y = -0.55;
        this.armR.rotation.set(-0.9, 0, -0.2);
        this.armL.rotation.set(-0.5 + Math.sin(this.phase * 0.3) * 0.1, 0, 0.3);
        this.head.rotation.y = Math.sin(this.phase * 0.15) * 0.4;
        break;
      case 'dig': {
        this.digT -= dt;
        const k = Math.max(0, this.digT / 0.7);
        const swing = Math.sin((1 - k) * Math.PI);
        this.body.rotation.x = 0.35 * swing;
        this.armR.rotation.set(-0.4 - swing * 1.2, 0, -0.1);
        this.armL.rotation.set(-0.6 - swing * 1.0, 0, 0.3);
        if (this.digT <= 0) this.pose = 'idle';
        break;
      }
      case 'cheer':
        this.armL.rotation.set(0, 0, 2.6 + s * 0.2);
        this.armR.rotation.set(0, 0, -2.6 - s * 0.2);
        this.body.position.y = Math.abs(s) * 0.25;
        break;
      default:
        this.body.position.y = Math.sin(this.phase * 0.4) * 0.02;
        this.armL.rotation.z = 0.15 + Math.sin(this.phase * 0.4) * 0.04;
    }
  }
}
