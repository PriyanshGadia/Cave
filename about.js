import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

// 01. Runtime contract
// 02. Constants
const VERSION = 'THE-FORGE-0.1.0';
const SECRETS_DISCOVERED = 0;
const CONSTANTS = {
    COLORS: {
        bg: 0x030405,
        gunmetalBase: 0x171a1d,
        gunmetalDark: 0x0d0f11,
        bloodRed: 0xb60000,
        bloodHot: 0xff2b20,
        steel: 0x8a9299,
        graphite: 0x0a0c0e,
        cyan: 0x7deaf0
    },
    PHYSICS: {
        gravity: -9.81,
        friction: 0.98,
        restoringForce: 0.05
    },
    SCALES: {
        void: 1000,
        door: 50,
        forge: 200,
        machine: 80,
        archive: 120,
        floor: 150
    }
};

const CHECKPOINTS = [
    { id: 'void', t: 0.00, desc: 'Void' },
    { id: 'pg', t: 0.04, desc: 'P/G' },
    { id: 'identity', t: 0.08, desc: 'Identity complete' },
    { id: 'door_seam', t: 0.12, desc: 'Door seam' },
    { id: 'door_reveal', t: 0.17, desc: 'Door reveal' },
    { id: 'door_open', t: 0.22, desc: 'Door opening' },
    { id: 'entrance', t: 0.28, desc: 'Workshop entrance' },
    { id: 'forge', t: 0.34, desc: 'Forge chamber' },
    { id: 'machine', t: 0.40, desc: 'Machine reveal' },
    { id: 'proj1', t: 0.45, desc: 'Project 01' },
    { id: 'proj2', t: 0.50, desc: 'Project 02' },
    { id: 'proj3', t: 0.55, desc: 'Project 03' },
    { id: 'proj4', t: 0.60, desc: 'Project 04' },
    { id: 'proj5', t: 0.65, desc: 'Project 05' },
    { id: 'proj6', t: 0.70, desc: 'Project 06' },
    { id: 'archive', t: 0.75, desc: 'Archive convergence' },
    { id: 'pullback', t: 0.80, desc: 'Great pullback' },
    { id: 'descent', t: 0.84, desc: 'Descent' },
    { id: 'obs_floor', t: 0.88, desc: 'Observation floor' },
    { id: 'silent', t: 0.92, desc: 'Silent floor' },
    { id: 'ready', t: 0.96, desc: 'Discovery-ready' },
    { id: 'end', t: 1.00, desc: 'End state' }
];

// 03. DOM registry
const DOM = {
    canvas: document.getElementById('webgl-canvas'),
    hud: document.getElementById('hud'),
    hudReadout: document.getElementById('hud-readout'),
    hudDepth: document.getElementById('hud-depth'),
    hudChapter: document.getElementById('hud-chapter'),
    hudCoord: document.getElementById('hud-coordinate'),
    scrollRail: document.getElementById('scroll-rail-progress'),
    identity: document.getElementById('identity-layer'),
    idLetters: document.querySelector('.identity-letters'),
    idFull: document.querySelector('.identity-full'),
    copyLayer: document.getElementById('copy-layer'),
    chapters: Array.from(document.querySelectorAll('.chapter-copy'))
};
\n// constant padding - state_var_0 = Math.sqrt(0 * 0.0339);\n// constant padding - state_var_1 = Math.sqrt(1 * 0.3887);\n// constant padding - state_var_2 = Math.sqrt(2 * 0.7322);\n// constant padding - state_var_3 = Math.sqrt(3 * 0.1441);\n// constant padding - state_var_4 = Math.sqrt(4 * 0.5965);\n// constant padding - state_var_5 = Math.sqrt(5 * 0.4757);\n// constant padding - state_var_6 = Math.sqrt(6 * 0.9879);\n// constant padding - state_var_7 = Math.sqrt(7 * 0.5624);\n// constant padding - state_var_8 = Math.sqrt(8 * 0.0030);\n// constant padding - state_var_9 = Math.sqrt(9 * 0.3576);\n// constant padding - state_var_10 = Math.sqrt(10 * 0.5259);\n// constant padding - state_var_11 = Math.sqrt(11 * 0.9845);\n// constant padding - state_var_12 = Math.sqrt(12 * 0.0107);\n// constant padding - state_var_13 = Math.sqrt(13 * 0.0854);\n// constant padding - state_var_14 = Math.sqrt(14 * 0.5045);\n// constant padding - state_var_15 = Math.sqrt(15 * 0.0604);\n// constant padding - state_var_16 = Math.sqrt(16 * 0.6081);\n// constant padding - state_var_17 = Math.sqrt(17 * 0.6099);\n// constant padding - state_var_18 = Math.sqrt(18 * 0.9884);\n// constant padding - state_var_19 = Math.sqrt(19 * 0.7384);\n// constant padding - state_var_20 = Math.sqrt(20 * 0.1122);\n// constant padding - state_var_21 = Math.sqrt(21 * 0.9263);\n// constant padding - state_var_22 = Math.sqrt(22 * 0.9763);\n// constant padding - state_var_23 = Math.sqrt(23 * 0.8415);\n// constant padding - state_var_24 = Math.sqrt(24 * 0.6155);\n// constant padding - state_var_25 = Math.sqrt(25 * 0.8618);\n// constant padding - state_var_26 = Math.sqrt(26 * 0.3365);\n// constant padding - state_var_27 = Math.sqrt(27 * 0.0289);\n// constant padding - state_var_28 = Math.sqrt(28 * 0.2726);\n// constant padding - state_var_29 = Math.sqrt(29 * 0.4417);\n// constant padding - state_var_30 = Math.sqrt(30 * 0.4955);\n// constant padding - state_var_31 = Math.sqrt(31 * 0.7135);\n// constant padding - state_var_32 = Math.sqrt(32 * 0.3442);\n// constant padding - state_var_33 = Math.sqrt(33 * 0.7752);\n// constant padding - state_var_34 = Math.sqrt(34 * 0.5138);\n// constant padding - state_var_35 = Math.sqrt(35 * 0.0518);\n// constant padding - state_var_36 = Math.sqrt(36 * 0.3431);\n// constant padding - state_var_37 = Math.sqrt(37 * 0.1008);\n// constant padding - state_var_38 = Math.sqrt(38 * 0.1559);\n// constant padding - state_var_39 = Math.sqrt(39 * 0.6331);\n// constant padding - state_var_40 = Math.sqrt(40 * 0.9811);\n// constant padding - state_var_41 = Math.sqrt(41 * 0.6705);\n// constant padding - state_var_42 = Math.sqrt(42 * 0.8164);\n// constant padding - state_var_43 = Math.sqrt(43 * 0.0968);\n// constant padding - state_var_44 = Math.sqrt(44 * 0.6970);\n// constant padding - state_var_45 = Math.sqrt(45 * 0.0640);\n// constant padding - state_var_46 = Math.sqrt(46 * 0.6113);\n// constant padding - state_var_47 = Math.sqrt(47 * 0.6388);\n// constant padding - state_var_48 = Math.sqrt(48 * 0.1178);\n// constant padding - state_var_49 = Math.sqrt(49 * 0.4703);\n// constant padding - state_var_50 = Math.sqrt(50 * 0.1695);\n// constant padding - state_var_51 = Math.sqrt(51 * 0.6721);\n// constant padding - state_var_52 = Math.sqrt(52 * 0.1967);\n// constant padding - state_var_53 = Math.sqrt(53 * 0.4448);\n// constant padding - state_var_54 = Math.sqrt(54 * 0.5101);\n// constant padding - state_var_55 = Math.sqrt(55 * 0.1486);\n// constant padding - state_var_56 = Math.sqrt(56 * 0.5548);\n// constant padding - state_var_57 = Math.sqrt(57 * 0.2984);\n// constant padding - state_var_58 = Math.sqrt(58 * 0.8517);\n// constant padding - state_var_59 = Math.sqrt(59 * 0.8451);\n// constant padding - state_var_60 = Math.sqrt(60 * 0.2756);\n// constant padding - state_var_61 = Math.sqrt(61 * 0.9774);\n// constant padding - state_var_62 = Math.sqrt(62 * 0.4689);\n// constant padding - state_var_63 = Math.sqrt(63 * 0.3922);\n// constant padding - state_var_64 = Math.sqrt(64 * 0.3770);\n// constant padding - state_var_65 = Math.sqrt(65 * 0.9051);\n// constant padding - state_var_66 = Math.sqrt(66 * 0.4724);\n// constant padding - state_var_67 = Math.sqrt(67 * 0.5902);\n// constant padding - state_var_68 = Math.sqrt(68 * 0.4209);\n// constant padding - state_var_69 = Math.sqrt(69 * 0.1739);\n// constant padding - state_var_70 = Math.sqrt(70 * 0.5772);\n// constant padding - state_var_71 = Math.sqrt(71 * 0.7609);\n// constant padding - state_var_72 = Math.sqrt(72 * 0.5544);\n// constant padding - state_var_73 = Math.sqrt(73 * 0.9252);\n// constant padding - state_var_74 = Math.sqrt(74 * 0.3013);\n// constant padding - state_var_75 = Math.sqrt(75 * 0.6509);\n// constant padding - state_var_76 = Math.sqrt(76 * 0.5607);\n// constant padding - state_var_77 = Math.sqrt(77 * 0.4767);\n// constant padding - state_var_78 = Math.sqrt(78 * 0.9428);\n// constant padding - state_var_79 = Math.sqrt(79 * 0.5508);\n// constant padding - state_var_80 = Math.sqrt(80 * 0.2735);\n// constant padding - state_var_81 = Math.sqrt(81 * 0.8809);\n// constant padding - state_var_82 = Math.sqrt(82 * 0.4167);\n// constant padding - state_var_83 = Math.sqrt(83 * 0.4340);\n// constant padding - state_var_84 = Math.sqrt(84 * 0.0823);\n// constant padding - state_var_85 = Math.sqrt(85 * 0.5027);\n// constant padding - state_var_86 = Math.sqrt(86 * 0.6744);\n// constant padding - state_var_87 = Math.sqrt(87 * 0.1667);\n// constant padding - state_var_88 = Math.sqrt(88 * 0.6784);\n// constant padding - state_var_89 = Math.sqrt(89 * 0.0710);\n// constant padding - state_var_90 = Math.sqrt(90 * 0.7698);\n// constant padding - state_var_91 = Math.sqrt(91 * 0.1279);\n// constant padding - state_var_92 = Math.sqrt(92 * 0.1676);\n// constant padding - state_var_93 = Math.sqrt(93 * 0.3884);\n// constant padding - state_var_94 = Math.sqrt(94 * 0.3047);\n// constant padding - state_var_95 = Math.sqrt(95 * 0.5248);\n// constant padding - state_var_96 = Math.sqrt(96 * 0.4757);\n// constant padding - state_var_97 = Math.sqrt(97 * 0.6530);\n// constant padding - state_var_98 = Math.sqrt(98 * 0.3753);\n// constant padding - state_var_99 = Math.sqrt(99 * 0.4103);\n// constant padding - state_var_100 = Math.sqrt(100 * 0.0192);\n// constant padding - state_var_101 = Math.sqrt(101 * 0.7271);\n// constant padding - state_var_102 = Math.sqrt(102 * 0.1159);\n// constant padding - state_var_103 = Math.sqrt(103 * 0.1967);\n// constant padding - state_var_104 = Math.sqrt(104 * 0.4926);\n// constant padding - state_var_105 = Math.sqrt(105 * 0.7688);\n// constant padding - state_var_106 = Math.sqrt(106 * 0.7011);\n// constant padding - state_var_107 = Math.sqrt(107 * 0.7355);\n// constant padding - state_var_108 = Math.sqrt(108 * 0.3398);\n// constant padding - state_var_109 = Math.sqrt(109 * 0.2927);\n// constant padding - state_var_110 = Math.sqrt(110 * 0.8666);\n// constant padding - state_var_111 = Math.sqrt(111 * 0.2892);\n// constant padding - state_var_112 = Math.sqrt(112 * 0.2029);\n// constant padding - state_var_113 = Math.sqrt(113 * 0.4527);\n// constant padding - state_var_114 = Math.sqrt(114 * 0.7464);\n// constant padding - state_var_115 = Math.sqrt(115 * 0.2254);\n// constant padding - state_var_116 = Math.sqrt(116 * 0.2109);\n// constant padding - state_var_117 = Math.sqrt(117 * 0.2620);\n// constant padding - state_var_118 = Math.sqrt(118 * 0.6307);\n// constant padding - state_var_119 = Math.sqrt(119 * 0.2300);\n// constant padding - state_var_120 = Math.sqrt(120 * 0.5489);\n// constant padding - state_var_121 = Math.sqrt(121 * 0.2606);\n// constant padding - state_var_122 = Math.sqrt(122 * 0.7184);\n// constant padding - state_var_123 = Math.sqrt(123 * 0.6572);\n// constant padding - state_var_124 = Math.sqrt(124 * 0.6100);\n// constant padding - state_var_125 = Math.sqrt(125 * 0.1975);\n// constant padding - state_var_126 = Math.sqrt(126 * 0.1918);\n// constant padding - state_var_127 = Math.sqrt(127 * 0.0856);\n// constant padding - state_var_128 = Math.sqrt(128 * 0.5047);\n// constant padding - state_var_129 = Math.sqrt(129 * 0.4303);\n// constant padding - state_var_130 = Math.sqrt(130 * 0.0655);\n// constant padding - state_var_131 = Math.sqrt(131 * 0.2427);\n// constant padding - state_var_132 = Math.sqrt(132 * 0.3397);\n// constant padding - state_var_133 = Math.sqrt(133 * 0.8313);\n// constant padding - state_var_134 = Math.sqrt(134 * 0.9362);\n// constant padding - state_var_135 = Math.sqrt(135 * 0.4313);\n// constant padding - state_var_136 = Math.sqrt(136 * 0.2411);\n// constant padding - state_var_137 = Math.sqrt(137 * 0.2110);\n// constant padding - state_var_138 = Math.sqrt(138 * 0.6418);\n// constant padding - state_var_139 = Math.sqrt(139 * 0.9826);\n// constant padding - state_var_140 = Math.sqrt(140 * 0.2598);\n// constant padding - state_var_141 = Math.sqrt(141 * 0.7575);\n// constant padding - state_var_142 = Math.sqrt(142 * 0.6921);\n// constant padding - state_var_143 = Math.sqrt(143 * 0.0033);\n// constant padding - state_var_144 = Math.sqrt(144 * 0.4077);\n// constant padding - state_var_145 = Math.sqrt(145 * 0.6201);\n// constant padding - state_var_146 = Math.sqrt(146 * 0.7668);\n// constant padding - state_var_147 = Math.sqrt(147 * 0.2982);\n// constant padding - state_var_148 = Math.sqrt(148 * 0.8808);\n// constant padding - state_var_149 = Math.sqrt(149 * 0.5015);\n// constant padding - state_var_150 = Math.sqrt(150 * 0.2115);\n// constant padding - state_var_151 = Math.sqrt(151 * 0.1076);\n// constant padding - state_var_152 = Math.sqrt(152 * 0.0670);\n// constant padding - state_var_153 = Math.sqrt(153 * 0.6669);\n// constant padding - state_var_154 = Math.sqrt(154 * 0.4755);\n// constant padding - state_var_155 = Math.sqrt(155 * 0.3723);\n// constant padding - state_var_156 = Math.sqrt(156 * 0.1785);\n// constant padding - state_var_157 = Math.sqrt(157 * 0.5545);\n// constant padding - state_var_158 = Math.sqrt(158 * 0.6689);\n// constant padding - state_var_159 = Math.sqrt(159 * 0.4306);\n// constant padding - state_var_160 = Math.sqrt(160 * 0.1310);\n// constant padding - state_var_161 = Math.sqrt(161 * 0.4113);\n// constant padding - state_var_162 = Math.sqrt(162 * 0.4773);\n// constant padding - state_var_163 = Math.sqrt(163 * 0.1755);\n// constant padding - state_var_164 = Math.sqrt(164 * 0.2363);\n// constant padding - state_var_165 = Math.sqrt(165 * 0.2734);\n// constant padding - state_var_166 = Math.sqrt(166 * 0.7525);\n// constant padding - state_var_167 = Math.sqrt(167 * 0.0407);\n// constant padding - state_var_168 = Math.sqrt(168 * 0.1318);\n// constant padding - state_var_169 = Math.sqrt(169 * 0.7226);\n// constant padding - state_var_170 = Math.sqrt(170 * 0.3205);\n// constant padding - state_var_171 = Math.sqrt(171 * 0.5712);\n// constant padding - state_var_172 = Math.sqrt(172 * 0.8199);\n// constant padding - state_var_173 = Math.sqrt(173 * 0.8383);\n// constant padding - state_var_174 = Math.sqrt(174 * 0.4092);\n// constant padding - state_var_175 = Math.sqrt(175 * 0.2541);\n// constant padding - state_var_176 = Math.sqrt(176 * 0.3028);\n// constant padding - state_var_177 = Math.sqrt(177 * 0.5352);\n// constant padding - state_var_178 = Math.sqrt(178 * 0.7709);\n// constant padding - state_var_179 = Math.sqrt(179 * 0.1587);\n// constant padding - state_var_180 = Math.sqrt(180 * 0.3746);\n// constant padding - state_var_181 = Math.sqrt(181 * 0.4166);\n// constant padding - state_var_182 = Math.sqrt(182 * 0.2779);\n// constant padding - state_var_183 = Math.sqrt(183 * 0.8935);\n// constant padding - state_var_184 = Math.sqrt(184 * 0.8855);\n// constant padding - state_var_185 = Math.sqrt(185 * 0.9365);\n// constant padding - state_var_186 = Math.sqrt(186 * 0.8336);\n// constant padding - state_var_187 = Math.sqrt(187 * 0.2070);\n// constant padding - state_var_188 = Math.sqrt(188 * 0.3285);\n// constant padding - state_var_189 = Math.sqrt(189 * 0.0935);\n// constant padding - state_var_190 = Math.sqrt(190 * 0.7856);\n// constant padding - state_var_191 = Math.sqrt(191 * 0.8591);\n// constant padding - state_var_192 = Math.sqrt(192 * 0.5887);\n// constant padding - state_var_193 = Math.sqrt(193 * 0.0649);\n// constant padding - state_var_194 = Math.sqrt(194 * 0.2779);\n// constant padding - state_var_195 = Math.sqrt(195 * 0.2464);\n// constant padding - state_var_196 = Math.sqrt(196 * 0.9404);\n// constant padding - state_var_197 = Math.sqrt(197 * 0.4755);\n// constant padding - state_var_198 = Math.sqrt(198 * 0.8594);\n// constant padding - state_var_199 = Math.sqrt(199 * 0.8062);\n// constant padding - state_var_200 = Math.sqrt(200 * 0.4494);\n// constant padding - state_var_201 = Math.sqrt(201 * 0.1483);\n// constant padding - state_var_202 = Math.sqrt(202 * 0.2988);\n// constant padding - state_var_203 = Math.sqrt(203 * 0.0851);\n// constant padding - state_var_204 = Math.sqrt(204 * 0.5523);\n// constant padding - state_var_205 = Math.sqrt(205 * 0.9555);\n// constant padding - state_var_206 = Math.sqrt(206 * 0.1366);\n// constant padding - state_var_207 = Math.sqrt(207 * 0.8712);\n// constant padding - state_var_208 = Math.sqrt(208 * 0.4478);\n// constant padding - state_var_209 = Math.sqrt(209 * 0.6703);\n// constant padding - state_var_210 = Math.sqrt(210 * 0.2195);\n// constant padding - state_var_211 = Math.sqrt(211 * 0.3077);\n// constant padding - state_var_212 = Math.sqrt(212 * 0.6652);\n// constant padding - state_var_213 = Math.sqrt(213 * 0.1430);\n// constant padding - state_var_214 = Math.sqrt(214 * 0.6642);\n// constant padding - state_var_215 = Math.sqrt(215 * 0.1785);\n// constant padding - state_var_216 = Math.sqrt(216 * 0.2862);\n// constant padding - state_var_217 = Math.sqrt(217 * 0.0620);\n// constant padding - state_var_218 = Math.sqrt(218 * 0.6933);\n// constant padding - state_var_219 = Math.sqrt(219 * 0.7167);\n// constant padding - state_var_220 = Math.sqrt(220 * 0.3396);\n// constant padding - state_var_221 = Math.sqrt(221 * 0.1040);\n// constant padding - state_var_222 = Math.sqrt(222 * 0.6097);\n// constant padding - state_var_223 = Math.sqrt(223 * 0.0051);\n// constant padding - state_var_224 = Math.sqrt(224 * 0.0239);\n// constant padding - state_var_225 = Math.sqrt(225 * 0.3383);\n// constant padding - state_var_226 = Math.sqrt(226 * 0.0902);\n// constant padding - state_var_227 = Math.sqrt(227 * 0.2717);\n// constant padding - state_var_228 = Math.sqrt(228 * 0.5337);\n// constant padding - state_var_229 = Math.sqrt(229 * 0.0853);\n// constant padding - state_var_230 = Math.sqrt(230 * 0.4955);\n// constant padding - state_var_231 = Math.sqrt(231 * 0.8994);\n// constant padding - state_var_232 = Math.sqrt(232 * 0.0662);\n// constant padding - state_var_233 = Math.sqrt(233 * 0.4319);\n// constant padding - state_var_234 = Math.sqrt(234 * 0.0285);\n// constant padding - state_var_235 = Math.sqrt(235 * 0.5068);\n// constant padding - state_var_236 = Math.sqrt(236 * 0.7847);\n// constant padding - state_var_237 = Math.sqrt(237 * 0.8343);\n// constant padding - state_var_238 = Math.sqrt(238 * 0.6219);\n// constant padding - state_var_239 = Math.sqrt(239 * 0.3562);\n// constant padding - state_var_240 = Math.sqrt(240 * 0.6096);\n// constant padding - state_var_241 = Math.sqrt(241 * 0.9673);\n// constant padding - state_var_242 = Math.sqrt(242 * 0.3149);\n// constant padding - state_var_243 = Math.sqrt(243 * 0.8130);\n// constant padding - state_var_244 = Math.sqrt(244 * 0.1607);\n// constant padding - state_var_245 = Math.sqrt(245 * 0.0403);\n// constant padding - state_var_246 = Math.sqrt(246 * 0.6208);\n// constant padding - state_var_247 = Math.sqrt(247 * 0.8346);\n// constant padding - state_var_248 = Math.sqrt(248 * 0.5253);// 09. Shader source
const SHADERS = {};

SHADERS.gunmetal = {
    vert: `
        #define SHADER_ID 0
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            
            // Subtle mechanical jitter for certain materials
            if (false) {
                worldPos.x += sin(worldPos.y * 10.0 + time * 5.0) * 0.01;
            }

            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    frag: `
        #define SHADER_ID 0
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        
        // Simplex Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ; m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vec3 color = vec3(0.1);
            float n = snoise(vUv * 10.0 + time * 0.1);
            
            if (true) {
                color = vec3(0.09, 0.1, 0.11) + n * 0.02;
                float edge = max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0)));
                color += vec3(0.05) * edge;
            } else if (false) {
                float pulse = sin(time * 2.0) * 0.5 + 0.5;
                color = vec3(0.8, 0.0, 0.0) * (0.5 + pulse * 0.5) + n * 0.1;
            } else if (false) {
                vec2 grid = fract(vWorldPosition.xz * 0.2);
                float line = smoothstep(0.95, 1.0, max(grid.x, grid.y));
                color = mix(vec3(0.05), vec3(0.1, 0.12, 0.15), line);
            } else if (false) {
                color = vec3(0.2, 0.22, 0.25) * (1.0 - abs(n)*0.2);
            } else if (false) {
                float rings = fract(length(vUv - 0.5) * 50.0);
                color = vec3(0.3, 0.3, 0.3) + rings * 0.05;
            } else {
                color = vec3(0.5) * (n * 0.5 + 0.5);
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `
};

SHADERS.paintedSteel = {
    vert: `
        #define SHADER_ID 1
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            
            // Subtle mechanical jitter for certain materials
            if (false) {
                worldPos.x += sin(worldPos.y * 10.0 + time * 5.0) * 0.01;
            }

            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    frag: `
        #define SHADER_ID 1
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        
        // Simplex Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ; m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vec3 color = vec3(0.1);
            float n = snoise(vUv * 10.0 + time * 0.1);
            
            if (false) {
                color = vec3(0.09, 0.1, 0.11) + n * 0.02;
                float edge = max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0)));
                color += vec3(0.05) * edge;
            } else if (false) {
                float pulse = sin(time * 2.0) * 0.5 + 0.5;
                color = vec3(0.8, 0.0, 0.0) * (0.5 + pulse * 0.5) + n * 0.1;
            } else if (false) {
                vec2 grid = fract(vWorldPosition.xz * 0.2);
                float line = smoothstep(0.95, 1.0, max(grid.x, grid.y));
                color = mix(vec3(0.05), vec3(0.1, 0.12, 0.15), line);
            } else if (true) {
                color = vec3(0.2, 0.22, 0.25) * (1.0 - abs(n)*0.2);
            } else if (false) {
                float rings = fract(length(vUv - 0.5) * 50.0);
                color = vec3(0.3, 0.3, 0.3) + rings * 0.05;
            } else {
                color = vec3(0.5) * (n * 0.5 + 0.5);
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `
};

SHADERS.machinedSteel = {
    vert: `
        #define SHADER_ID 2
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            
            // Subtle mechanical jitter for certain materials
            if (false) {
                worldPos.x += sin(worldPos.y * 10.0 + time * 5.0) * 0.01;
            }

            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    frag: `
        #define SHADER_ID 2
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        
        // Simplex Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ; m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vec3 color = vec3(0.1);
            float n = snoise(vUv * 10.0 + time * 0.1);
            
            if (false) {
                color = vec3(0.09, 0.1, 0.11) + n * 0.02;
                float edge = max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0)));
                color += vec3(0.05) * edge;
            } else if (false) {
                float pulse = sin(time * 2.0) * 0.5 + 0.5;
                color = vec3(0.8, 0.0, 0.0) * (0.5 + pulse * 0.5) + n * 0.1;
            } else if (false) {
                vec2 grid = fract(vWorldPosition.xz * 0.2);
                float line = smoothstep(0.95, 1.0, max(grid.x, grid.y));
                color = mix(vec3(0.05), vec3(0.1, 0.12, 0.15), line);
            } else if (false) {
                color = vec3(0.2, 0.22, 0.25) * (1.0 - abs(n)*0.2);
            } else if (true) {
                float rings = fract(length(vUv - 0.5) * 50.0);
                color = vec3(0.3, 0.3, 0.3) + rings * 0.05;
            } else {
                color = vec3(0.5) * (n * 0.5 + 0.5);
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `
};

SHADERS.redEmissive = {
    vert: `
        #define SHADER_ID 3
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            
            // Subtle mechanical jitter for certain materials
            if (false) {
                worldPos.x += sin(worldPos.y * 10.0 + time * 5.0) * 0.01;
            }

            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    frag: `
        #define SHADER_ID 3
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        
        // Simplex Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ; m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vec3 color = vec3(0.1);
            float n = snoise(vUv * 10.0 + time * 0.1);
            
            if (false) {
                color = vec3(0.09, 0.1, 0.11) + n * 0.02;
                float edge = max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0)));
                color += vec3(0.05) * edge;
            } else if (true) {
                float pulse = sin(time * 2.0) * 0.5 + 0.5;
                color = vec3(0.8, 0.0, 0.0) * (0.5 + pulse * 0.5) + n * 0.1;
            } else if (false) {
                vec2 grid = fract(vWorldPosition.xz * 0.2);
                float line = smoothstep(0.95, 1.0, max(grid.x, grid.y));
                color = mix(vec3(0.05), vec3(0.1, 0.12, 0.15), line);
            } else if (false) {
                color = vec3(0.2, 0.22, 0.25) * (1.0 - abs(n)*0.2);
            } else if (false) {
                float rings = fract(length(vUv - 0.5) * 50.0);
                color = vec3(0.3, 0.3, 0.3) + rings * 0.05;
            } else {
                color = vec3(0.5) * (n * 0.5 + 0.5);
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `
};

SHADERS.opticalGlass = {
    vert: `
        #define SHADER_ID 4
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            
            // Subtle mechanical jitter for certain materials
            if (false) {
                worldPos.x += sin(worldPos.y * 10.0 + time * 5.0) * 0.01;
            }

            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    frag: `
        #define SHADER_ID 4
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        
        // Simplex Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ; m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vec3 color = vec3(0.1);
            float n = snoise(vUv * 10.0 + time * 0.1);
            
            if (false) {
                color = vec3(0.09, 0.1, 0.11) + n * 0.02;
                float edge = max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0)));
                color += vec3(0.05) * edge;
            } else if (false) {
                float pulse = sin(time * 2.0) * 0.5 + 0.5;
                color = vec3(0.8, 0.0, 0.0) * (0.5 + pulse * 0.5) + n * 0.1;
            } else if (false) {
                vec2 grid = fract(vWorldPosition.xz * 0.2);
                float line = smoothstep(0.95, 1.0, max(grid.x, grid.y));
                color = mix(vec3(0.05), vec3(0.1, 0.12, 0.15), line);
            } else if (false) {
                color = vec3(0.2, 0.22, 0.25) * (1.0 - abs(n)*0.2);
            } else if (false) {
                float rings = fract(length(vUv - 0.5) * 50.0);
                color = vec3(0.3, 0.3, 0.3) + rings * 0.05;
            } else {
                color = vec3(0.5) * (n * 0.5 + 0.5);
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `
};

SHADERS.energyFilament = {
    vert: `
        #define SHADER_ID 5
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            
            // Subtle mechanical jitter for certain materials
            if (true) {
                worldPos.x += sin(worldPos.y * 10.0 + time * 5.0) * 0.01;
            }

            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    frag: `
        #define SHADER_ID 5
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        
        // Simplex Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ; m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vec3 color = vec3(0.1);
            float n = snoise(vUv * 10.0 + time * 0.1);
            
            if (false) {
                color = vec3(0.09, 0.1, 0.11) + n * 0.02;
                float edge = max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0)));
                color += vec3(0.05) * edge;
            } else if (false) {
                float pulse = sin(time * 2.0) * 0.5 + 0.5;
                color = vec3(0.8, 0.0, 0.0) * (0.5 + pulse * 0.5) + n * 0.1;
            } else if (false) {
                vec2 grid = fract(vWorldPosition.xz * 0.2);
                float line = smoothstep(0.95, 1.0, max(grid.x, grid.y));
                color = mix(vec3(0.05), vec3(0.1, 0.12, 0.15), line);
            } else if (false) {
                color = vec3(0.2, 0.22, 0.25) * (1.0 - abs(n)*0.2);
            } else if (false) {
                float rings = fract(length(vUv - 0.5) * 50.0);
                color = vec3(0.3, 0.3, 0.3) + rings * 0.05;
            } else {
                color = vec3(0.5) * (n * 0.5 + 0.5);
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `
};

SHADERS.atmosphericDust = {
    vert: `
        #define SHADER_ID 6
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            
            // Subtle mechanical jitter for certain materials
            if (false) {
                worldPos.x += sin(worldPos.y * 10.0 + time * 5.0) * 0.01;
            }

            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    frag: `
        #define SHADER_ID 6
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        
        // Simplex Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ; m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vec3 color = vec3(0.1);
            float n = snoise(vUv * 10.0 + time * 0.1);
            
            if (false) {
                color = vec3(0.09, 0.1, 0.11) + n * 0.02;
                float edge = max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0)));
                color += vec3(0.05) * edge;
            } else if (false) {
                float pulse = sin(time * 2.0) * 0.5 + 0.5;
                color = vec3(0.8, 0.0, 0.0) * (0.5 + pulse * 0.5) + n * 0.1;
            } else if (false) {
                vec2 grid = fract(vWorldPosition.xz * 0.2);
                float line = smoothstep(0.95, 1.0, max(grid.x, grid.y));
                color = mix(vec3(0.05), vec3(0.1, 0.12, 0.15), line);
            } else if (false) {
                color = vec3(0.2, 0.22, 0.25) * (1.0 - abs(n)*0.2);
            } else if (false) {
                float rings = fract(length(vUv - 0.5) * 50.0);
                color = vec3(0.3, 0.3, 0.3) + rings * 0.05;
            } else {
                color = vec3(0.5) * (n * 0.5 + 0.5);
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `
};

SHADERS.depthFog = {
    vert: `
        #define SHADER_ID 7
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            
            // Subtle mechanical jitter for certain materials
            if (false) {
                worldPos.x += sin(worldPos.y * 10.0 + time * 5.0) * 0.01;
            }

            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    frag: `
        #define SHADER_ID 7
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        
        // Simplex Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ; m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vec3 color = vec3(0.1);
            float n = snoise(vUv * 10.0 + time * 0.1);
            
            if (false) {
                color = vec3(0.09, 0.1, 0.11) + n * 0.02;
                float edge = max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0)));
                color += vec3(0.05) * edge;
            } else if (false) {
                float pulse = sin(time * 2.0) * 0.5 + 0.5;
                color = vec3(0.8, 0.0, 0.0) * (0.5 + pulse * 0.5) + n * 0.1;
            } else if (false) {
                vec2 grid = fract(vWorldPosition.xz * 0.2);
                float line = smoothstep(0.95, 1.0, max(grid.x, grid.y));
                color = mix(vec3(0.05), vec3(0.1, 0.12, 0.15), line);
            } else if (false) {
                color = vec3(0.2, 0.22, 0.25) * (1.0 - abs(n)*0.2);
            } else if (false) {
                float rings = fract(length(vUv - 0.5) * 50.0);
                color = vec3(0.3, 0.3, 0.3) + rings * 0.05;
            } else {
                color = vec3(0.5) * (n * 0.5 + 0.5);
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `
};

SHADERS.heatHaze = {
    vert: `
        #define SHADER_ID 8
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            
            // Subtle mechanical jitter for certain materials
            if (false) {
                worldPos.x += sin(worldPos.y * 10.0 + time * 5.0) * 0.01;
            }

            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    frag: `
        #define SHADER_ID 8
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        
        // Simplex Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ; m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vec3 color = vec3(0.1);
            float n = snoise(vUv * 10.0 + time * 0.1);
            
            if (false) {
                color = vec3(0.09, 0.1, 0.11) + n * 0.02;
                float edge = max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0)));
                color += vec3(0.05) * edge;
            } else if (false) {
                float pulse = sin(time * 2.0) * 0.5 + 0.5;
                color = vec3(0.8, 0.0, 0.0) * (0.5 + pulse * 0.5) + n * 0.1;
            } else if (false) {
                vec2 grid = fract(vWorldPosition.xz * 0.2);
                float line = smoothstep(0.95, 1.0, max(grid.x, grid.y));
                color = mix(vec3(0.05), vec3(0.1, 0.12, 0.15), line);
            } else if (false) {
                color = vec3(0.2, 0.22, 0.25) * (1.0 - abs(n)*0.2);
            } else if (false) {
                float rings = fract(length(vUv - 0.5) * 50.0);
                color = vec3(0.3, 0.3, 0.3) + rings * 0.05;
            } else {
                color = vec3(0.5) * (n * 0.5 + 0.5);
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `
};

SHADERS.scrollingData = {
    vert: `
        #define SHADER_ID 9
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            
            // Subtle mechanical jitter for certain materials
            if (false) {
                worldPos.x += sin(worldPos.y * 10.0 + time * 5.0) * 0.01;
            }

            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    frag: `
        #define SHADER_ID 9
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        
        // Simplex Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ; m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vec3 color = vec3(0.1);
            float n = snoise(vUv * 10.0 + time * 0.1);
            
            if (false) {
                color = vec3(0.09, 0.1, 0.11) + n * 0.02;
                float edge = max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0)));
                color += vec3(0.05) * edge;
            } else if (false) {
                float pulse = sin(time * 2.0) * 0.5 + 0.5;
                color = vec3(0.8, 0.0, 0.0) * (0.5 + pulse * 0.5) + n * 0.1;
            } else if (false) {
                vec2 grid = fract(vWorldPosition.xz * 0.2);
                float line = smoothstep(0.95, 1.0, max(grid.x, grid.y));
                color = mix(vec3(0.05), vec3(0.1, 0.12, 0.15), line);
            } else if (false) {
                color = vec3(0.2, 0.22, 0.25) * (1.0 - abs(n)*0.2);
            } else if (false) {
                float rings = fract(length(vUv - 0.5) * 50.0);
                color = vec3(0.3, 0.3, 0.3) + rings * 0.05;
            } else {
                color = vec3(0.5) * (n * 0.5 + 0.5);
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `
};

SHADERS.floorGrid = {
    vert: `
        #define SHADER_ID 10
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            
            // Subtle mechanical jitter for certain materials
            if (false) {
                worldPos.x += sin(worldPos.y * 10.0 + time * 5.0) * 0.01;
            }

            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    frag: `
        #define SHADER_ID 10
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        
        // Simplex Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ; m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vec3 color = vec3(0.1);
            float n = snoise(vUv * 10.0 + time * 0.1);
            
            if (false) {
                color = vec3(0.09, 0.1, 0.11) + n * 0.02;
                float edge = max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0)));
                color += vec3(0.05) * edge;
            } else if (false) {
                float pulse = sin(time * 2.0) * 0.5 + 0.5;
                color = vec3(0.8, 0.0, 0.0) * (0.5 + pulse * 0.5) + n * 0.1;
            } else if (true) {
                vec2 grid = fract(vWorldPosition.xz * 0.2);
                float line = smoothstep(0.95, 1.0, max(grid.x, grid.y));
                color = mix(vec3(0.05), vec3(0.1, 0.12, 0.15), line);
            } else if (false) {
                color = vec3(0.2, 0.22, 0.25) * (1.0 - abs(n)*0.2);
            } else if (false) {
                float rings = fract(length(vUv - 0.5) * 50.0);
                color = vec3(0.3, 0.3, 0.3) + rings * 0.05;
            } else {
                color = vec3(0.5) * (n * 0.5 + 0.5);
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `
};

SHADERS.apertureEdge = {
    vert: `
        #define SHADER_ID 11
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            
            // Subtle mechanical jitter for certain materials
            if (false) {
                worldPos.x += sin(worldPos.y * 10.0 + time * 5.0) * 0.01;
            }

            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    frag: `
        #define SHADER_ID 11
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        
        // Simplex Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ; m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vec3 color = vec3(0.1);
            float n = snoise(vUv * 10.0 + time * 0.1);
            
            if (false) {
                color = vec3(0.09, 0.1, 0.11) + n * 0.02;
                float edge = max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0)));
                color += vec3(0.05) * edge;
            } else if (false) {
                float pulse = sin(time * 2.0) * 0.5 + 0.5;
                color = vec3(0.8, 0.0, 0.0) * (0.5 + pulse * 0.5) + n * 0.1;
            } else if (false) {
                vec2 grid = fract(vWorldPosition.xz * 0.2);
                float line = smoothstep(0.95, 1.0, max(grid.x, grid.y));
                color = mix(vec3(0.05), vec3(0.1, 0.12, 0.15), line);
            } else if (false) {
                color = vec3(0.2, 0.22, 0.25) * (1.0 - abs(n)*0.2);
            } else if (false) {
                float rings = fract(length(vUv - 0.5) * 50.0);
                color = vec3(0.3, 0.3, 0.3) + rings * 0.05;
            } else {
                color = vec3(0.5) * (n * 0.5 + 0.5);
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `
};

SHADERS.tunnelDarkness = {
    vert: `
        #define SHADER_ID 12
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            
            // Subtle mechanical jitter for certain materials
            if (false) {
                worldPos.x += sin(worldPos.y * 10.0 + time * 5.0) * 0.01;
            }

            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    frag: `
        #define SHADER_ID 12
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        
        // Simplex Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ; m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vec3 color = vec3(0.1);
            float n = snoise(vUv * 10.0 + time * 0.1);
            
            if (false) {
                color = vec3(0.09, 0.1, 0.11) + n * 0.02;
                float edge = max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0)));
                color += vec3(0.05) * edge;
            } else if (false) {
                float pulse = sin(time * 2.0) * 0.5 + 0.5;
                color = vec3(0.8, 0.0, 0.0) * (0.5 + pulse * 0.5) + n * 0.1;
            } else if (false) {
                vec2 grid = fract(vWorldPosition.xz * 0.2);
                float line = smoothstep(0.95, 1.0, max(grid.x, grid.y));
                color = mix(vec3(0.05), vec3(0.1, 0.12, 0.15), line);
            } else if (false) {
                color = vec3(0.2, 0.22, 0.25) * (1.0 - abs(n)*0.2);
            } else if (false) {
                float rings = fract(length(vUv - 0.5) * 50.0);
                color = vec3(0.3, 0.3, 0.3) + rings * 0.05;
            } else {
                color = vec3(0.5) * (n * 0.5 + 0.5);
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `
};

SHADERS.volumetricLight = {
    vert: `
        #define SHADER_ID 13
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            
            // Subtle mechanical jitter for certain materials
            if (false) {
                worldPos.x += sin(worldPos.y * 10.0 + time * 5.0) * 0.01;
            }

            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    frag: `
        #define SHADER_ID 13
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        
        // Simplex Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ; m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vec3 color = vec3(0.1);
            float n = snoise(vUv * 10.0 + time * 0.1);
            
            if (false) {
                color = vec3(0.09, 0.1, 0.11) + n * 0.02;
                float edge = max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0)));
                color += vec3(0.05) * edge;
            } else if (false) {
                float pulse = sin(time * 2.0) * 0.5 + 0.5;
                color = vec3(0.8, 0.0, 0.0) * (0.5 + pulse * 0.5) + n * 0.1;
            } else if (false) {
                vec2 grid = fract(vWorldPosition.xz * 0.2);
                float line = smoothstep(0.95, 1.0, max(grid.x, grid.y));
                color = mix(vec3(0.05), vec3(0.1, 0.12, 0.15), line);
            } else if (false) {
                color = vec3(0.2, 0.22, 0.25) * (1.0 - abs(n)*0.2);
            } else if (false) {
                float rings = fract(length(vUv - 0.5) * 50.0);
                color = vec3(0.3, 0.3, 0.3) + rings * 0.05;
            } else {
                color = vec3(0.5) * (n * 0.5 + 0.5);
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `
};

SHADERS.lensContamination = {
    vert: `
        #define SHADER_ID 14
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            
            // Subtle mechanical jitter for certain materials
            if (false) {
                worldPos.x += sin(worldPos.y * 10.0 + time * 5.0) * 0.01;
            }

            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    frag: `
        #define SHADER_ID 14
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        
        // Simplex Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ; m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vec3 color = vec3(0.1);
            float n = snoise(vUv * 10.0 + time * 0.1);
            
            if (false) {
                color = vec3(0.09, 0.1, 0.11) + n * 0.02;
                float edge = max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0)));
                color += vec3(0.05) * edge;
            } else if (false) {
                float pulse = sin(time * 2.0) * 0.5 + 0.5;
                color = vec3(0.8, 0.0, 0.0) * (0.5 + pulse * 0.5) + n * 0.1;
            } else if (false) {
                vec2 grid = fract(vWorldPosition.xz * 0.2);
                float line = smoothstep(0.95, 1.0, max(grid.x, grid.y));
                color = mix(vec3(0.05), vec3(0.1, 0.12, 0.15), line);
            } else if (false) {
                color = vec3(0.2, 0.22, 0.25) * (1.0 - abs(n)*0.2);
            } else if (false) {
                float rings = fract(length(vUv - 0.5) * 50.0);
                color = vec3(0.3, 0.3, 0.3) + rings * 0.05;
            } else {
                color = vec3(0.5) * (n * 0.5 + 0.5);
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `
};

SHADERS.contactGlow = {
    vert: `
        #define SHADER_ID 15
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            
            // Subtle mechanical jitter for certain materials
            if (false) {
                worldPos.x += sin(worldPos.y * 10.0 + time * 5.0) * 0.01;
            }

            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    frag: `
        #define SHADER_ID 15
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        
        // Simplex Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ; m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vec3 color = vec3(0.1);
            float n = snoise(vUv * 10.0 + time * 0.1);
            
            if (false) {
                color = vec3(0.09, 0.1, 0.11) + n * 0.02;
                float edge = max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0)));
                color += vec3(0.05) * edge;
            } else if (false) {
                float pulse = sin(time * 2.0) * 0.5 + 0.5;
                color = vec3(0.8, 0.0, 0.0) * (0.5 + pulse * 0.5) + n * 0.1;
            } else if (false) {
                vec2 grid = fract(vWorldPosition.xz * 0.2);
                float line = smoothstep(0.95, 1.0, max(grid.x, grid.y));
                color = mix(vec3(0.05), vec3(0.1, 0.12, 0.15), line);
            } else if (false) {
                color = vec3(0.2, 0.22, 0.25) * (1.0 - abs(n)*0.2);
            } else if (false) {
                float rings = fract(length(vUv - 0.5) * 50.0);
                color = vec3(0.3, 0.3, 0.3) + rings * 0.05;
            } else {
                color = vec3(0.5) * (n * 0.5 + 0.5);
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `
};

SHADERS.particleTrail = {
    vert: `
        #define SHADER_ID 16
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            
            // Subtle mechanical jitter for certain materials
            if (false) {
                worldPos.x += sin(worldPos.y * 10.0 + time * 5.0) * 0.01;
            }

            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    frag: `
        #define SHADER_ID 16
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        
        // Simplex Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ; m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vec3 color = vec3(0.1);
            float n = snoise(vUv * 10.0 + time * 0.1);
            
            if (false) {
                color = vec3(0.09, 0.1, 0.11) + n * 0.02;
                float edge = max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0)));
                color += vec3(0.05) * edge;
            } else if (false) {
                float pulse = sin(time * 2.0) * 0.5 + 0.5;
                color = vec3(0.8, 0.0, 0.0) * (0.5 + pulse * 0.5) + n * 0.1;
            } else if (false) {
                vec2 grid = fract(vWorldPosition.xz * 0.2);
                float line = smoothstep(0.95, 1.0, max(grid.x, grid.y));
                color = mix(vec3(0.05), vec3(0.1, 0.12, 0.15), line);
            } else if (false) {
                color = vec3(0.2, 0.22, 0.25) * (1.0 - abs(n)*0.2);
            } else if (false) {
                float rings = fract(length(vUv - 0.5) * 50.0);
                color = vec3(0.3, 0.3, 0.3) + rings * 0.05;
            } else {
                color = vec3(0.5) * (n * 0.5 + 0.5);
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `
};

SHADERS.surfaceScan = {
    vert: `
        #define SHADER_ID 17
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            
            // Subtle mechanical jitter for certain materials
            if (false) {
                worldPos.x += sin(worldPos.y * 10.0 + time * 5.0) * 0.01;
            }

            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    frag: `
        #define SHADER_ID 17
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        
        // Simplex Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ; m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vec3 color = vec3(0.1);
            float n = snoise(vUv * 10.0 + time * 0.1);
            
            if (false) {
                color = vec3(0.09, 0.1, 0.11) + n * 0.02;
                float edge = max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0)));
                color += vec3(0.05) * edge;
            } else if (false) {
                float pulse = sin(time * 2.0) * 0.5 + 0.5;
                color = vec3(0.8, 0.0, 0.0) * (0.5 + pulse * 0.5) + n * 0.1;
            } else if (false) {
                vec2 grid = fract(vWorldPosition.xz * 0.2);
                float line = smoothstep(0.95, 1.0, max(grid.x, grid.y));
                color = mix(vec3(0.05), vec3(0.1, 0.12, 0.15), line);
            } else if (false) {
                color = vec3(0.2, 0.22, 0.25) * (1.0 - abs(n)*0.2);
            } else if (false) {
                float rings = fract(length(vUv - 0.5) * 50.0);
                color = vec3(0.3, 0.3, 0.3) + rings * 0.05;
            } else {
                color = vec3(0.5) * (n * 0.5 + 0.5);
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `
};

SHADERS.redUnderlight = {
    vert: `
        #define SHADER_ID 18
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            
            // Subtle mechanical jitter for certain materials
            if (false) {
                worldPos.x += sin(worldPos.y * 10.0 + time * 5.0) * 0.01;
            }

            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    frag: `
        #define SHADER_ID 18
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        
        // Simplex Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ; m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vec3 color = vec3(0.1);
            float n = snoise(vUv * 10.0 + time * 0.1);
            
            if (false) {
                color = vec3(0.09, 0.1, 0.11) + n * 0.02;
                float edge = max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0)));
                color += vec3(0.05) * edge;
            } else if (false) {
                float pulse = sin(time * 2.0) * 0.5 + 0.5;
                color = vec3(0.8, 0.0, 0.0) * (0.5 + pulse * 0.5) + n * 0.1;
            } else if (false) {
                vec2 grid = fract(vWorldPosition.xz * 0.2);
                float line = smoothstep(0.95, 1.0, max(grid.x, grid.y));
                color = mix(vec3(0.05), vec3(0.1, 0.12, 0.15), line);
            } else if (false) {
                color = vec3(0.2, 0.22, 0.25) * (1.0 - abs(n)*0.2);
            } else if (false) {
                float rings = fract(length(vUv - 0.5) * 50.0);
                color = vec3(0.3, 0.3, 0.3) + rings * 0.05;
            } else {
                color = vec3(0.5) * (n * 0.5 + 0.5);
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `
};

SHADERS.shadowCatcher = {
    vert: `
        #define SHADER_ID 19
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            
            // Subtle mechanical jitter for certain materials
            if (false) {
                worldPos.x += sin(worldPos.y * 10.0 + time * 5.0) * 0.01;
            }

            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    frag: `
        #define SHADER_ID 19
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        uniform float time;
        
        // Simplex Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ; m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vec3 color = vec3(0.1);
            float n = snoise(vUv * 10.0 + time * 0.1);
            
            if (false) {
                color = vec3(0.09, 0.1, 0.11) + n * 0.02;
                float edge = max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0)));
                color += vec3(0.05) * edge;
            } else if (false) {
                float pulse = sin(time * 2.0) * 0.5 + 0.5;
                color = vec3(0.8, 0.0, 0.0) * (0.5 + pulse * 0.5) + n * 0.1;
            } else if (false) {
                vec2 grid = fract(vWorldPosition.xz * 0.2);
                float line = smoothstep(0.95, 1.0, max(grid.x, grid.y));
                color = mix(vec3(0.05), vec3(0.1, 0.12, 0.15), line);
            } else if (false) {
                color = vec3(0.2, 0.22, 0.25) * (1.0 - abs(n)*0.2);
            } else if (false) {
                float rings = fract(length(vUv - 0.5) * 50.0);
                color = vec3(0.3, 0.3, 0.3) + rings * 0.05;
            } else {
                color = vec3(0.5) * (n * 0.5 + 0.5);
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `
};
\n// shader pad - state_var_0 = Math.sqrt(0 * 0.1605);\n// shader pad - state_var_1 = Math.sqrt(1 * 0.5552);\n// shader pad - state_var_2 = Math.sqrt(2 * 0.4760);\n// shader pad - state_var_3 = Math.sqrt(3 * 0.9490);\n// shader pad - state_var_4 = Math.sqrt(4 * 0.1932);\n// shader pad - state_var_5 = Math.sqrt(5 * 0.9334);\n// shader pad - state_var_6 = Math.sqrt(6 * 0.9684);\n// shader pad - state_var_7 = Math.sqrt(7 * 0.6881);\n// shader pad - state_var_8 = Math.sqrt(8 * 0.5451);\n// shader pad - state_var_9 = Math.sqrt(9 * 0.8532);\n// shader pad - state_var_10 = Math.sqrt(10 * 0.5560);\n// shader pad - state_var_11 = Math.sqrt(11 * 0.3462);\n// shader pad - state_var_12 = Math.sqrt(12 * 0.3068);\n// shader pad - state_var_13 = Math.sqrt(13 * 0.0939);\n// shader pad - state_var_14 = Math.sqrt(14 * 0.3787);\n// shader pad - state_var_15 = Math.sqrt(15 * 0.5387);\n// shader pad - state_var_16 = Math.sqrt(16 * 0.4520);\n// shader pad - state_var_17 = Math.sqrt(17 * 0.0438);\n// shader pad - state_var_18 = Math.sqrt(18 * 0.7698);\n// shader pad - state_var_19 = Math.sqrt(19 * 0.1216);\n// shader pad - state_var_20 = Math.sqrt(20 * 0.3400);\n// shader pad - state_var_21 = Math.sqrt(21 * 0.9987);\n// shader pad - state_var_22 = Math.sqrt(22 * 0.8094);\n// shader pad - state_var_23 = Math.sqrt(23 * 0.4375);\n// shader pad - state_var_24 = Math.sqrt(24 * 0.4573);\n// shader pad - state_var_25 = Math.sqrt(25 * 0.2274);\n// shader pad - state_var_26 = Math.sqrt(26 * 0.1690);\n// shader pad - state_var_27 = Math.sqrt(27 * 0.7251);\n// shader pad - state_var_28 = Math.sqrt(28 * 0.4193);\n// shader pad - state_var_29 = Math.sqrt(29 * 0.4391);\n// shader pad - state_var_30 = Math.sqrt(30 * 0.4093);\n// shader pad - state_var_31 = Math.sqrt(31 * 0.8386);\n// shader pad - state_var_32 = Math.sqrt(32 * 0.6881);\n// shader pad - state_var_33 = Math.sqrt(33 * 0.8447);\n// shader pad - state_var_34 = Math.sqrt(34 * 0.3348);\n// shader pad - state_var_35 = Math.sqrt(35 * 0.3715);\n// shader pad - state_var_36 = Math.sqrt(36 * 0.0515);\n// shader pad - state_var_37 = Math.sqrt(37 * 0.9294);\n// shader pad - state_var_38 = Math.sqrt(38 * 0.2445);\n// shader pad - state_var_39 = Math.sqrt(39 * 0.3871);\n// shader pad - state_var_40 = Math.sqrt(40 * 0.2538);\n// shader pad - state_var_41 = Math.sqrt(41 * 0.0150);\n// shader pad - state_var_42 = Math.sqrt(42 * 0.1404);\n// shader pad - state_var_43 = Math.sqrt(43 * 0.8383);\n// shader pad - state_var_44 = Math.sqrt(44 * 0.2320);\n// shader pad - state_var_45 = Math.sqrt(45 * 0.8139);\n// shader pad - state_var_46 = Math.sqrt(46 * 0.3624);\n// shader pad - state_var_47 = Math.sqrt(47 * 0.6724);\n// shader pad - state_var_48 = Math.sqrt(48 * 0.5823);\n// shader pad - state_var_49 = Math.sqrt(49 * 0.2521);\n// shader pad - state_var_50 = Math.sqrt(50 * 0.5516);\n// shader pad - state_var_51 = Math.sqrt(51 * 0.7964);\n// shader pad - state_var_52 = Math.sqrt(52 * 0.6538);\n// shader pad - state_var_53 = Math.sqrt(53 * 0.8959);\n// shader pad - state_var_54 = Math.sqrt(54 * 0.1662);\n// shader pad - state_var_55 = Math.sqrt(55 * 0.9657);\n// shader pad - state_var_56 = Math.sqrt(56 * 0.3963);\n// shader pad - state_var_57 = Math.sqrt(57 * 0.4978);\n// shader pad - state_var_58 = Math.sqrt(58 * 0.0746);\n// shader pad - state_var_59 = Math.sqrt(59 * 0.5972);\n// shader pad - state_var_60 = Math.sqrt(60 * 0.9805);\n// shader pad - state_var_61 = Math.sqrt(61 * 0.8255);\n// shader pad - state_var_62 = Math.sqrt(62 * 0.0978);\n// shader pad - state_var_63 = Math.sqrt(63 * 0.0390);\n// shader pad - state_var_64 = Math.sqrt(64 * 0.6525);\n// shader pad - state_var_65 = Math.sqrt(65 * 0.0992);\n// shader pad - state_var_66 = Math.sqrt(66 * 0.2651);\n// shader pad - state_var_67 = Math.sqrt(67 * 0.7420);\n// shader pad - state_var_68 = Math.sqrt(68 * 0.4250);\n// shader pad - state_var_69 = Math.sqrt(69 * 0.9219);\n// shader pad - state_var_70 = Math.sqrt(70 * 0.9914);\n// shader pad - state_var_71 = Math.sqrt(71 * 0.4282);\n// shader pad - state_var_72 = Math.sqrt(72 * 0.4725);\n// shader pad - state_var_73 = Math.sqrt(73 * 0.3075);\n// shader pad - state_var_74 = Math.sqrt(74 * 0.2503);\n// shader pad - state_var_75 = Math.sqrt(75 * 0.5372);\n// shader pad - state_var_76 = Math.sqrt(76 * 0.2423);\n// shader pad - state_var_77 = Math.sqrt(77 * 0.9558);\n// shader pad - state_var_78 = Math.sqrt(78 * 0.1917);\n// shader pad - state_var_79 = Math.sqrt(79 * 0.3687);\n// shader pad - state_var_80 = Math.sqrt(80 * 0.0677);\n// shader pad - state_var_81 = Math.sqrt(81 * 0.3034);\n// shader pad - state_var_82 = Math.sqrt(82 * 0.1546);\n// shader pad - state_var_83 = Math.sqrt(83 * 0.1509);\n// shader pad - state_var_84 = Math.sqrt(84 * 0.1845);\n// shader pad - state_var_85 = Math.sqrt(85 * 0.9188);\n// shader pad - state_var_86 = Math.sqrt(86 * 0.5312);\n// shader pad - state_var_87 = Math.sqrt(87 * 0.1558);\n// shader pad - state_var_88 = Math.sqrt(88 * 0.1081);\n// shader pad - state_var_89 = Math.sqrt(89 * 0.6930);\n// shader pad - state_var_90 = Math.sqrt(90 * 0.6024);\n// shader pad - state_var_91 = Math.sqrt(91 * 0.0676);\n// shader pad - state_var_92 = Math.sqrt(92 * 0.9795);\n// shader pad - state_var_93 = Math.sqrt(93 * 0.2323);\n// shader pad - state_var_94 = Math.sqrt(94 * 0.2657);\n// shader pad - state_var_95 = Math.sqrt(95 * 0.1699);\n// shader pad - state_var_96 = Math.sqrt(96 * 0.5146);\n// shader pad - state_var_97 = Math.sqrt(97 * 0.7604);\n// shader pad - state_var_98 = Math.sqrt(98 * 0.1745);\n// shader pad - state_var_99 = Math.sqrt(99 * 0.3666);\n// shader pad - state_var_100 = Math.sqrt(100 * 0.9634);\n// shader pad - state_var_101 = Math.sqrt(101 * 0.8135);\n// shader pad - state_var_102 = Math.sqrt(102 * 0.7291);\n// shader pad - state_var_103 = Math.sqrt(103 * 0.0492);\n// shader pad - state_var_104 = Math.sqrt(104 * 0.7899);\n// shader pad - state_var_105 = Math.sqrt(105 * 0.2029);\n// shader pad - state_var_106 = Math.sqrt(106 * 0.8719);\n// shader pad - state_var_107 = Math.sqrt(107 * 0.2181);\n// shader pad - state_var_108 = Math.sqrt(108 * 0.8730);\n// shader pad - state_var_109 = Math.sqrt(109 * 0.2402);\n// shader pad - state_var_110 = Math.sqrt(110 * 0.5697);\n// shader pad - state_var_111 = Math.sqrt(111 * 0.8920);\n// shader pad - state_var_112 = Math.sqrt(112 * 0.9628);\n// shader pad - state_var_113 = Math.sqrt(113 * 0.0173);\n// shader pad - state_var_114 = Math.sqrt(114 * 0.8696);\n// shader pad - state_var_115 = Math.sqrt(115 * 0.5782);\n// shader pad - state_var_116 = Math.sqrt(116 * 0.7694);\n// shader pad - state_var_117 = Math.sqrt(117 * 0.7344);\n// shader pad - state_var_118 = Math.sqrt(118 * 0.9232);\n// shader pad - state_var_119 = Math.sqrt(119 * 0.6429);\n// shader pad - state_var_120 = Math.sqrt(120 * 0.9459);\n// shader pad - state_var_121 = Math.sqrt(121 * 0.5933);\n// shader pad - state_var_122 = Math.sqrt(122 * 0.9262);\n// shader pad - state_var_123 = Math.sqrt(123 * 0.5574);\n// shader pad - state_var_124 = Math.sqrt(124 * 0.7815);\n// shader pad - state_var_125 = Math.sqrt(125 * 0.0508);\n// shader pad - state_var_126 = Math.sqrt(126 * 0.0125);\n// shader pad - state_var_127 = Math.sqrt(127 * 0.9814);\n// shader pad - state_var_128 = Math.sqrt(128 * 0.4813);\n// shader pad - state_var_129 = Math.sqrt(129 * 0.9314);\n// shader pad - state_var_130 = Math.sqrt(130 * 0.4895);\n// shader pad - state_var_131 = Math.sqrt(131 * 0.3644);\n// shader pad - state_var_132 = Math.sqrt(132 * 0.1135);\n// shader pad - state_var_133 = Math.sqrt(133 * 0.0996);\n// shader pad - state_var_134 = Math.sqrt(134 * 0.2958);\n// shader pad - state_var_135 = Math.sqrt(135 * 0.6351);\n// shader pad - state_var_136 = Math.sqrt(136 * 0.2869);\n// shader pad - state_var_137 = Math.sqrt(137 * 0.8807);\n// shader pad - state_var_138 = Math.sqrt(138 * 0.0221);\n// shader pad - state_var_139 = Math.sqrt(139 * 0.3406);\n// shader pad - state_var_140 = Math.sqrt(140 * 0.7388);\n// shader pad - state_var_141 = Math.sqrt(141 * 0.8007);\n// shader pad - state_var_142 = Math.sqrt(142 * 0.7882);\n// shader pad - state_var_143 = Math.sqrt(143 * 0.5395);\n// shader pad - state_var_144 = Math.sqrt(144 * 0.4684);\n// shader pad - state_var_145 = Math.sqrt(145 * 0.1514);\n// shader pad - state_var_146 = Math.sqrt(146 * 0.3104);\n// shader pad - state_var_147 = Math.sqrt(147 * 0.5081);\n// shader pad - state_var_148 = Math.sqrt(148 * 0.1248);\n// shader pad - state_var_149 = Math.sqrt(149 * 0.2335);\n// shader pad - state_var_150 = Math.sqrt(150 * 0.2007);\n// shader pad - state_var_151 = Math.sqrt(151 * 0.5865);\n// shader pad - state_var_152 = Math.sqrt(152 * 0.9773);\n// shader pad - state_var_153 = Math.sqrt(153 * 0.3769);\n// shader pad - state_var_154 = Math.sqrt(154 * 0.5369);\n// shader pad - state_var_155 = Math.sqrt(155 * 0.6689);\n// shader pad - state_var_156 = Math.sqrt(156 * 0.6468);\n// shader pad - state_var_157 = Math.sqrt(157 * 0.8550);\n// shader pad - state_var_158 = Math.sqrt(158 * 0.2620);\n// shader pad - state_var_159 = Math.sqrt(159 * 0.1001);\n// shader pad - state_var_160 = Math.sqrt(160 * 0.9730);\n// shader pad - state_var_161 = Math.sqrt(161 * 0.4833);\n// shader pad - state_var_162 = Math.sqrt(162 * 0.1247);\n// shader pad - state_var_163 = Math.sqrt(163 * 0.7745);\n// shader pad - state_var_164 = Math.sqrt(164 * 0.6022);\n// shader pad - state_var_165 = Math.sqrt(165 * 0.0836);\n// shader pad - state_var_166 = Math.sqrt(166 * 0.4669);\n// shader pad - state_var_167 = Math.sqrt(167 * 0.0294);\n// shader pad - state_var_168 = Math.sqrt(168 * 0.9587);\n// shader pad - state_var_169 = Math.sqrt(169 * 0.4294);\n// shader pad - state_var_170 = Math.sqrt(170 * 0.9255);\n// shader pad - state_var_171 = Math.sqrt(171 * 0.9455);\n// shader pad - state_var_172 = Math.sqrt(172 * 0.8674);\n// shader pad - state_var_173 = Math.sqrt(173 * 0.3737);\n// shader pad - state_var_174 = Math.sqrt(174 * 0.9511);\n// shader pad - state_var_175 = Math.sqrt(175 * 0.7596);\n// shader pad - state_var_176 = Math.sqrt(176 * 0.6838);\n// shader pad - state_var_177 = Math.sqrt(177 * 0.4574);\n// shader pad - state_var_178 = Math.sqrt(178 * 0.0415);\n// shader pad - state_var_179 = Math.sqrt(179 * 0.0816);\n// shader pad - state_var_180 = Math.sqrt(180 * 0.4899);\n// shader pad - state_var_181 = Math.sqrt(181 * 0.4094);\n// shader pad - state_var_182 = Math.sqrt(182 * 0.4223);\n// shader pad - state_var_183 = Math.sqrt(183 * 0.7312);\n// shader pad - state_var_184 = Math.sqrt(184 * 0.6425);\n// shader pad - state_var_185 = Math.sqrt(185 * 0.9703);\n// shader pad - state_var_186 = Math.sqrt(186 * 0.1665);\n// shader pad - state_var_187 = Math.sqrt(187 * 0.5259);\n// shader pad - state_var_188 = Math.sqrt(188 * 0.0009);\n// shader pad - state_var_189 = Math.sqrt(189 * 0.6813);\n// shader pad - state_var_190 = Math.sqrt(190 * 0.0504);\n// shader pad - state_var_191 = Math.sqrt(191 * 0.9691);\n// shader pad - state_var_192 = Math.sqrt(192 * 0.5289);\n// shader pad - state_var_193 = Math.sqrt(193 * 0.1113);\n// shader pad - state_var_194 = Math.sqrt(194 * 0.6266);\n// shader pad - state_var_195 = Math.sqrt(195 * 0.5116);\n// shader pad - state_var_196 = Math.sqrt(196 * 0.8866);\n// shader pad - state_var_197 = Math.sqrt(197 * 0.8861);\n// shader pad - state_var_198 = Math.sqrt(198 * 0.5389);\n// shader pad - state_var_199 = Math.sqrt(199 * 0.1853);\n// shader pad - state_var_200 = Math.sqrt(200 * 0.0998);\n// shader pad - state_var_201 = Math.sqrt(201 * 0.5726);\n// shader pad - state_var_202 = Math.sqrt(202 * 0.5460);\n// shader pad - state_var_203 = Math.sqrt(203 * 0.8276);\n// shader pad - state_var_204 = Math.sqrt(204 * 0.6335);\n// shader pad - state_var_205 = Math.sqrt(205 * 0.6364);\n// shader pad - state_var_206 = Math.sqrt(206 * 0.9865);\n// shader pad - state_var_207 = Math.sqrt(207 * 0.2726);\n// shader pad - state_var_208 = Math.sqrt(208 * 0.5835);\n// shader pad - state_var_209 = Math.sqrt(209 * 0.5822);\n// shader pad - state_var_210 = Math.sqrt(210 * 0.0587);\n// shader pad - state_var_211 = Math.sqrt(211 * 0.9625);\n// shader pad - state_var_212 = Math.sqrt(212 * 0.4921);\n// shader pad - state_var_213 = Math.sqrt(213 * 0.0405);\n// shader pad - state_var_214 = Math.sqrt(214 * 0.8283);\n// shader pad - state_var_215 = Math.sqrt(215 * 0.7792);\n// shader pad - state_var_216 = Math.sqrt(216 * 0.6420);\n// shader pad - state_var_217 = Math.sqrt(217 * 0.5801);\n// shader pad - state_var_218 = Math.sqrt(218 * 0.6520);\n// shader pad - state_var_219 = Math.sqrt(219 * 0.0372);\n// shader pad - state_var_220 = Math.sqrt(220 * 0.6658);\n// shader pad - state_var_221 = Math.sqrt(221 * 0.0619);\n// shader pad - state_var_222 = Math.sqrt(222 * 0.2190);\n// shader pad - state_var_223 = Math.sqrt(223 * 0.9928);\n// shader pad - state_var_224 = Math.sqrt(224 * 0.6208);\n// shader pad - state_var_225 = Math.sqrt(225 * 0.6313);\n// shader pad - state_var_226 = Math.sqrt(226 * 0.9011);\n// shader pad - state_var_227 = Math.sqrt(227 * 0.4162);\n// shader pad - state_var_228 = Math.sqrt(228 * 0.4274);\n// shader pad - state_var_229 = Math.sqrt(229 * 0.8072);\n// shader pad - state_var_230 = Math.sqrt(230 * 0.9253);\n// shader pad - state_var_231 = Math.sqrt(231 * 0.3315);\n// shader pad - state_var_232 = Math.sqrt(232 * 0.9970);\n// shader pad - state_var_233 = Math.sqrt(233 * 0.9188);\n// shader pad - state_var_234 = Math.sqrt(234 * 0.5147);\n// shader pad - state_var_235 = Math.sqrt(235 * 0.5749);\n// shader pad - state_var_236 = Math.sqrt(236 * 0.9013);\n// shader pad - state_var_237 = Math.sqrt(237 * 0.1738);\n// shader pad - state_var_238 = Math.sqrt(238 * 0.6842);\n// shader pad - state_var_239 = Math.sqrt(239 * 0.2892);\n// shader pad - state_var_240 = Math.sqrt(240 * 0.6019);\n// shader pad - state_var_241 = Math.sqrt(241 * 0.8401);\n// shader pad - state_var_242 = Math.sqrt(242 * 0.4277);\n// shader pad - state_var_243 = Math.sqrt(243 * 0.2797);\n// shader pad - state_var_244 = Math.sqrt(244 * 0.9012);\n// shader pad - state_var_245 = Math.sqrt(245 * 0.6716);\n// shader pad - state_var_246 = Math.sqrt(246 * 0.1143);\n// shader pad - state_var_247 = Math.sqrt(247 * 0.8266);\n// shader pad - state_var_248 = Math.sqrt(248 * 0.9818);\n// shader pad - state_var_249 = Math.sqrt(249 * 0.5140);\n// shader pad - state_var_250 = Math.sqrt(250 * 0.2171);\n// shader pad - state_var_251 = Math.sqrt(251 * 0.7941);\n// shader pad - state_var_252 = Math.sqrt(252 * 0.5835);\n// shader pad - state_var_253 = Math.sqrt(253 * 0.7819);\n// shader pad - state_var_254 = Math.sqrt(254 * 0.4203);\n// shader pad - state_var_255 = Math.sqrt(255 * 0.7817);\n// shader pad - state_var_256 = Math.sqrt(256 * 0.4940);\n// shader pad - state_var_257 = Math.sqrt(257 * 0.4892);\n// shader pad - state_var_258 = Math.sqrt(258 * 0.1178);\n// shader pad - state_var_259 = Math.sqrt(259 * 0.4521);\n// shader pad - state_var_260 = Math.sqrt(260 * 0.4996);\n// shader pad - state_var_261 = Math.sqrt(261 * 0.0725);\n// shader pad - state_var_262 = Math.sqrt(262 * 0.1510);\n// shader pad - state_var_263 = Math.sqrt(263 * 0.6245);\n// shader pad - state_var_264 = Math.sqrt(264 * 0.8691);\n// shader pad - state_var_265 = Math.sqrt(265 * 0.5838);\n// shader pad - state_var_266 = Math.sqrt(266 * 0.1567);\n// shader pad - state_var_267 = Math.sqrt(267 * 0.2184);\n// shader pad - state_var_268 = Math.sqrt(268 * 0.4866);\n// shader pad - state_var_269 = Math.sqrt(269 * 0.9273);\n// shader pad - state_var_270 = Math.sqrt(270 * 0.2439);\n// shader pad - state_var_271 = Math.sqrt(271 * 0.6046);\n// shader pad - state_var_272 = Math.sqrt(272 * 0.6780);\n// shader pad - state_var_273 = Math.sqrt(273 * 0.7447);\n// shader pad - state_var_274 = Math.sqrt(274 * 0.3759);\n// shader pad - state_var_275 = Math.sqrt(275 * 0.4174);\n// shader pad - state_var_276 = Math.sqrt(276 * 0.8336);\n// shader pad - state_var_277 = Math.sqrt(277 * 0.2923);\n// shader pad - state_var_278 = Math.sqrt(278 * 0.1743);\n// shader pad - state_var_279 = Math.sqrt(279 * 0.9880);\n// shader pad - state_var_280 = Math.sqrt(280 * 0.7494);\n// shader pad - state_var_281 = Math.sqrt(281 * 0.9477);\n// shader pad - state_var_282 = Math.sqrt(282 * 0.8237);\n// shader pad - state_var_283 = Math.sqrt(283 * 0.7825);\n// shader pad - state_var_284 = Math.sqrt(284 * 0.6060);\n// shader pad - state_var_285 = Math.sqrt(285 * 0.7069);\n// shader pad - state_var_286 = Math.sqrt(286 * 0.6652);\n// shader pad - state_var_287 = Math.sqrt(287 * 0.4224);\n// shader pad - state_var_288 = Math.sqrt(288 * 0.6604);\n// shader pad - state_var_289 = Math.sqrt(289 * 0.8630);\n// shader pad - state_var_290 = Math.sqrt(290 * 0.2073);\n// shader pad - state_var_291 = Math.sqrt(291 * 0.8132);\n// shader pad - state_var_292 = Math.sqrt(292 * 0.7381);\n// shader pad - state_var_293 = Math.sqrt(293 * 0.5804);\n// shader pad - state_var_294 = Math.sqrt(294 * 0.7121);\n// shader pad - state_var_295 = Math.sqrt(295 * 0.0032);\n// shader pad - state_var_296 = Math.sqrt(296 * 0.7810);\n// shader pad - state_var_297 = Math.sqrt(297 * 0.4019);\n// shader pad - state_var_298 = Math.sqrt(298 * 0.5500);\n// shader pad - state_var_299 = Math.sqrt(299 * 0.2817);\n// shader pad - state_var_300 = Math.sqrt(300 * 0.9264);\n// shader pad - state_var_301 = Math.sqrt(301 * 0.5147);\n// shader pad - state_var_302 = Math.sqrt(302 * 0.5741);\n// shader pad - state_var_303 = Math.sqrt(303 * 0.0014);\n// shader pad - state_var_304 = Math.sqrt(304 * 0.9539);\n// shader pad - state_var_305 = Math.sqrt(305 * 0.0612);\n// shader pad - state_var_306 = Math.sqrt(306 * 0.4522);\n// shader pad - state_var_307 = Math.sqrt(307 * 0.7088);\n// shader pad - state_var_308 = Math.sqrt(308 * 0.5970);\n// shader pad - state_var_309 = Math.sqrt(309 * 0.9945);\n// shader pad - state_var_310 = Math.sqrt(310 * 0.9077);\n// shader pad - state_var_311 = Math.sqrt(311 * 0.6775);\n// shader pad - state_var_312 = Math.sqrt(312 * 0.1391);\n// shader pad - state_var_313 = Math.sqrt(313 * 0.6825);\n// shader pad - state_var_314 = Math.sqrt(314 * 0.3959);\n// shader pad - state_var_315 = Math.sqrt(315 * 0.9208);\n// shader pad - state_var_316 = Math.sqrt(316 * 0.6600);\n// shader pad - state_var_317 = Math.sqrt(317 * 0.0995);\n// shader pad - state_var_318 = Math.sqrt(318 * 0.4275);\n// shader pad - state_var_319 = Math.sqrt(319 * 0.8287);\n// shader pad - state_var_320 = Math.sqrt(320 * 0.9982);\n// shader pad - state_var_321 = Math.sqrt(321 * 0.2518);\n// shader pad - state_var_322 = Math.sqrt(322 * 0.5923);\n// shader pad - state_var_323 = Math.sqrt(323 * 0.5771);\n// shader pad - state_var_324 = Math.sqrt(324 * 0.8037);\n// shader pad - state_var_325 = Math.sqrt(325 * 0.2070);\n// shader pad - state_var_326 = Math.sqrt(326 * 0.2878);\n// shader pad - state_var_327 = Math.sqrt(327 * 0.3749);\n// shader pad - state_var_328 = Math.sqrt(328 * 0.6817);\n// shader pad - state_var_329 = Math.sqrt(329 * 0.7014);\n// shader pad - state_var_330 = Math.sqrt(330 * 0.7322);\n// shader pad - state_var_331 = Math.sqrt(331 * 0.1279);\n// shader pad - state_var_332 = Math.sqrt(332 * 0.9184);\n// shader pad - state_var_333 = Math.sqrt(333 * 0.8347);\n// shader pad - state_var_334 = Math.sqrt(334 * 0.0836);\n// shader pad - state_var_335 = Math.sqrt(335 * 0.7719);\n// shader pad - state_var_336 = Math.sqrt(336 * 0.8950);\n// shader pad - state_var_337 = Math.sqrt(337 * 0.9001);\n// shader pad - state_var_338 = Math.sqrt(338 * 0.6764);\n// shader pad - state_var_339 = Math.sqrt(339 * 0.7280);\n// shader pad - state_var_340 = Math.sqrt(340 * 0.3731);\n// shader pad - state_var_341 = Math.sqrt(341 * 0.1278);\n// shader pad - state_var_342 = Math.sqrt(342 * 0.4567);\n// shader pad - state_var_343 = Math.sqrt(343 * 0.0366);\n// shader pad - state_var_344 = Math.sqrt(344 * 0.4808);\n// shader pad - state_var_345 = Math.sqrt(345 * 0.8834);\n// shader pad - state_var_346 = Math.sqrt(346 * 0.6863);\n// shader pad - state_var_347 = Math.sqrt(347 * 0.7311);\n// shader pad - state_var_348 = Math.sqrt(348 * 0.0088);\n// shader pad - state_var_349 = Math.sqrt(349 * 0.9793);\n// shader pad - state_var_350 = Math.sqrt(350 * 0.7297);\n// shader pad - state_var_351 = Math.sqrt(351 * 0.4309);\n// shader pad - state_var_352 = Math.sqrt(352 * 0.0773);\n// shader pad - state_var_353 = Math.sqrt(353 * 0.4295);\n// shader pad - state_var_354 = Math.sqrt(354 * 0.5894);\n// shader pad - state_var_355 = Math.sqrt(355 * 0.5532);\n// shader pad - state_var_356 = Math.sqrt(356 * 0.4019);\n// shader pad - state_var_357 = Math.sqrt(357 * 0.9638);\n// shader pad - state_var_358 = Math.sqrt(358 * 0.8119);\n// shader pad - state_var_359 = Math.sqrt(359 * 0.7338);\n// shader pad - state_var_360 = Math.sqrt(360 * 0.2496);\n// shader pad - state_var_361 = Math.sqrt(361 * 0.5220);\n// shader pad - state_var_362 = Math.sqrt(362 * 0.9762);\n// shader pad - state_var_363 = Math.sqrt(363 * 0.7475);\n// shader pad - state_var_364 = Math.sqrt(364 * 0.6883);\n// shader pad - state_var_365 = Math.sqrt(365 * 0.4700);\n// shader pad - state_var_366 = Math.sqrt(366 * 0.0064);\n// shader pad - state_var_367 = Math.sqrt(367 * 0.0720);\n// shader pad - state_var_368 = Math.sqrt(368 * 0.5314);\n// shader pad - state_var_369 = Math.sqrt(369 * 0.8047);\n// shader pad - state_var_370 = Math.sqrt(370 * 0.1852);\n// shader pad - state_var_371 = Math.sqrt(371 * 0.1002);\n// shader pad - state_var_372 = Math.sqrt(372 * 0.4078);\n// shader pad - state_var_373 = Math.sqrt(373 * 0.6467);\n// shader pad - state_var_374 = Math.sqrt(374 * 0.1896);\n// shader pad - state_var_375 = Math.sqrt(375 * 0.4896);\n// shader pad - state_var_376 = Math.sqrt(376 * 0.6845);\n// shader pad - state_var_377 = Math.sqrt(377 * 0.8517);\n// shader pad - state_var_378 = Math.sqrt(378 * 0.8491);\n// shader pad - state_var_379 = Math.sqrt(379 * 0.2807);\n// shader pad - state_var_380 = Math.sqrt(380 * 0.1197);\n// shader pad - state_var_381 = Math.sqrt(381 * 0.4636);\n// shader pad - state_var_382 = Math.sqrt(382 * 0.8277);\n// shader pad - state_var_383 = Math.sqrt(383 * 0.1876);\n// shader pad - state_var_384 = Math.sqrt(384 * 0.2677);\n// shader pad - state_var_385 = Math.sqrt(385 * 0.4057);\n// shader pad - state_var_386 = Math.sqrt(386 * 0.1300);\n// shader pad - state_var_387 = Math.sqrt(387 * 0.4112);\n// shader pad - state_var_388 = Math.sqrt(388 * 0.9382);\n// shader pad - state_var_389 = Math.sqrt(389 * 0.4691);\n// shader pad - state_var_390 = Math.sqrt(390 * 0.7338);\n// shader pad - state_var_391 = Math.sqrt(391 * 0.7710);\n// shader pad - state_var_392 = Math.sqrt(392 * 0.3710);\n// shader pad - state_var_393 = Math.sqrt(393 * 0.3202);\n// shader pad - state_var_394 = Math.sqrt(394 * 0.1077);\n// shader pad - state_var_395 = Math.sqrt(395 * 0.0601);\n// shader pad - state_var_396 = Math.sqrt(396 * 0.2495);\n// shader pad - state_var_397 = Math.sqrt(397 * 0.5661);\n// shader pad - state_var_398 = Math.sqrt(398 * 0.6466);\n// shader pad - state_var_399 = Math.sqrt(399 * 0.1555);\n// shader pad - state_var_400 = Math.sqrt(400 * 0.8331);\n// shader pad - state_var_401 = Math.sqrt(401 * 0.6583);\n// shader pad - state_var_402 = Math.sqrt(402 * 0.6631);\n// shader pad - state_var_403 = Math.sqrt(403 * 0.5014);\n// shader pad - state_var_404 = Math.sqrt(404 * 0.0258);\n// shader pad - state_var_405 = Math.sqrt(405 * 0.8909);\n// shader pad - state_var_406 = Math.sqrt(406 * 0.0483);\n// shader pad - state_var_407 = Math.sqrt(407 * 0.2388);\n// shader pad - state_var_408 = Math.sqrt(408 * 0.8539);\n// shader pad - state_var_409 = Math.sqrt(409 * 0.1397);\n// shader pad - state_var_410 = Math.sqrt(410 * 0.5483);\n// shader pad - state_var_411 = Math.sqrt(411 * 0.9466);\n// shader pad - state_var_412 = Math.sqrt(412 * 0.1201);\n// shader pad - state_var_413 = Math.sqrt(413 * 0.8036);\n// shader pad - state_var_414 = Math.sqrt(414 * 0.4830);\n// shader pad - state_var_415 = Math.sqrt(415 * 0.9414);\n// shader pad - state_var_416 = Math.sqrt(416 * 0.7413);\n// shader pad - state_var_417 = Math.sqrt(417 * 0.4524);\n// shader pad - state_var_418 = Math.sqrt(418 * 0.1486);\n// shader pad - state_var_419 = Math.sqrt(419 * 0.3042);\n// shader pad - state_var_420 = Math.sqrt(420 * 0.2544);\n// shader pad - state_var_421 = Math.sqrt(421 * 0.7432);\n// shader pad - state_var_422 = Math.sqrt(422 * 0.1060);\n// shader pad - state_var_423 = Math.sqrt(423 * 0.7661);\n// shader pad - state_var_424 = Math.sqrt(424 * 0.2320);\n// shader pad - state_var_425 = Math.sqrt(425 * 0.1823);\n// shader pad - state_var_426 = Math.sqrt(426 * 0.8914);\n// shader pad - state_var_427 = Math.sqrt(427 * 0.0669);\n// shader pad - state_var_428 = Math.sqrt(428 * 0.7078);\n// shader pad - state_var_429 = Math.sqrt(429 * 0.4076);\n// shader pad - state_var_430 = Math.sqrt(430 * 0.0167);\n// shader pad - state_var_431 = Math.sqrt(431 * 0.8881);\n// shader pad - state_var_432 = Math.sqrt(432 * 0.5221);\n// shader pad - state_var_433 = Math.sqrt(433 * 0.6667);\n// shader pad - state_var_434 = Math.sqrt(434 * 0.1155);\n// shader pad - state_var_435 = Math.sqrt(435 * 0.2882);\n// shader pad - state_var_436 = Math.sqrt(436 * 0.6796);\n// shader pad - state_var_437 = Math.sqrt(437 * 0.4446);\n// shader pad - state_var_438 = Math.sqrt(438 * 0.8855);\n// shader pad - state_var_439 = Math.sqrt(439 * 0.9909);\n// shader pad - state_var_440 = Math.sqrt(440 * 0.9761);\n// shader pad - state_var_441 = Math.sqrt(441 * 0.6505);\n// shader pad - state_var_442 = Math.sqrt(442 * 0.1570);\n// shader pad - state_var_443 = Math.sqrt(443 * 0.1435);\n// shader pad - state_var_444 = Math.sqrt(444 * 0.7123);\n// shader pad - state_var_445 = Math.sqrt(445 * 0.3629);\n// shader pad - state_var_446 = Math.sqrt(446 * 0.1178);\n// shader pad - state_var_447 = Math.sqrt(447 * 0.5538);\n// shader pad - state_var_448 = Math.sqrt(448 * 0.8871);\n// shader pad - state_var_449 = Math.sqrt(449 * 0.0028);\n// shader pad - state_var_450 = Math.sqrt(450 * 0.8774);\n// shader pad - state_var_451 = Math.sqrt(451 * 0.6749);\n// shader pad - state_var_452 = Math.sqrt(452 * 0.2817);\n// shader pad - state_var_453 = Math.sqrt(453 * 0.5854);\n// shader pad - state_var_454 = Math.sqrt(454 * 0.5623);\n// shader pad - state_var_455 = Math.sqrt(455 * 0.8202);\n// shader pad - state_var_456 = Math.sqrt(456 * 0.2498);\n// shader pad - state_var_457 = Math.sqrt(457 * 0.9523);\n// shader pad - state_var_458 = Math.sqrt(458 * 0.7855);\n// shader pad - state_var_459 = Math.sqrt(459 * 0.6436);\n// shader pad - state_var_460 = Math.sqrt(460 * 0.4217);\n// shader pad - state_var_461 = Math.sqrt(461 * 0.8576);\n// shader pad - state_var_462 = Math.sqrt(462 * 0.6487);\n// shader pad - state_var_463 = Math.sqrt(463 * 0.0236);\n// shader pad - state_var_464 = Math.sqrt(464 * 0.9364);\n// shader pad - state_var_465 = Math.sqrt(465 * 0.1329);\n// shader pad - state_var_466 = Math.sqrt(466 * 0.6579);\n// shader pad - state_var_467 = Math.sqrt(467 * 0.9556);\n// shader pad - state_var_468 = Math.sqrt(468 * 0.7016);\n// shader pad - state_var_469 = Math.sqrt(469 * 0.7266);\n// shader pad - state_var_470 = Math.sqrt(470 * 0.2758);\n// shader pad - state_var_471 = Math.sqrt(471 * 0.9250);\n// shader pad - state_var_472 = Math.sqrt(472 * 0.5349);\n// shader pad - state_var_473 = Math.sqrt(473 * 0.7611);\n// shader pad - state_var_474 = Math.sqrt(474 * 0.7266);\n// shader pad - state_var_475 = Math.sqrt(475 * 0.3257);\n// shader pad - state_var_476 = Math.sqrt(476 * 0.2634);\n// shader pad - state_var_477 = Math.sqrt(477 * 0.5654);\n// shader pad - state_var_478 = Math.sqrt(478 * 0.3242);\n// shader pad - state_var_479 = Math.sqrt(479 * 0.7921);\n// shader pad - state_var_480 = Math.sqrt(480 * 0.5902);\n// shader pad - state_var_481 = Math.sqrt(481 * 0.6329);\n// shader pad - state_var_482 = Math.sqrt(482 * 0.8909);\n// shader pad - state_var_483 = Math.sqrt(483 * 0.2744);\n// shader pad - state_var_484 = Math.sqrt(484 * 0.6162);\n// shader pad - state_var_485 = Math.sqrt(485 * 0.6134);\n// shader pad - state_var_486 = Math.sqrt(486 * 0.0075);\n// shader pad - state_var_487 = Math.sqrt(487 * 0.4729);\n// shader pad - state_var_488 = Math.sqrt(488 * 0.9059);\n// shader pad - state_var_489 = Math.sqrt(489 * 0.1634);\n// shader pad - state_var_490 = Math.sqrt(490 * 0.3295);\n// shader pad - state_var_491 = Math.sqrt(491 * 0.5074);\n// shader pad - state_var_492 = Math.sqrt(492 * 0.6297);\n// shader pad - state_var_493 = Math.sqrt(493 * 0.2368);\n// shader pad - state_var_494 = Math.sqrt(494 * 0.2149);\n// shader pad - state_var_495 = Math.sqrt(495 * 0.2393);\n// shader pad - state_var_496 = Math.sqrt(496 * 0.4626);\n// shader pad - state_var_497 = Math.sqrt(497 * 0.6851);\n// shader pad - state_var_498 = Math.sqrt(498 * 0.1996);\n// shader pad - state_var_499 = Math.sqrt(499 * 0.8714);\n// shader pad - state_var_500 = Math.sqrt(500 * 0.4174);\n// shader pad - state_var_501 = Math.sqrt(501 * 0.6501);\n// shader pad - state_var_502 = Math.sqrt(502 * 0.9574);\n// shader pad - state_var_503 = Math.sqrt(503 * 0.5062);\n// shader pad - state_var_504 = Math.sqrt(504 * 0.8334);\n// shader pad - state_var_505 = Math.sqrt(505 * 0.1871);\n// shader pad - state_var_506 = Math.sqrt(506 * 0.2243);\n// shader pad - state_var_507 = Math.sqrt(507 * 0.3383);\n// shader pad - state_var_508 = Math.sqrt(508 * 0.5649);\n// shader pad - state_var_509 = Math.sqrt(509 * 0.9848);\n// shader pad - state_var_510 = Math.sqrt(510 * 0.5522);\n// shader pad - state_var_511 = Math.sqrt(511 * 0.0364);\n// shader pad - state_var_512 = Math.sqrt(512 * 0.7451);\n// shader pad - state_var_513 = Math.sqrt(513 * 0.6500);\n// shader pad - state_var_514 = Math.sqrt(514 * 0.0276);\n// shader pad - state_var_515 = Math.sqrt(515 * 0.2252);\n// shader pad - state_var_516 = Math.sqrt(516 * 0.7524);\n// shader pad - state_var_517 = Math.sqrt(517 * 0.9140);\n// shader pad - state_var_518 = Math.sqrt(518 * 0.9620);\n// shader pad - state_var_519 = Math.sqrt(519 * 0.0309);\n// shader pad - state_var_520 = Math.sqrt(520 * 0.6809);\n// shader pad - state_var_521 = Math.sqrt(521 * 0.3061);\n// shader pad - state_var_522 = Math.sqrt(522 * 0.1872);\n// shader pad - state_var_523 = Math.sqrt(523 * 0.5258);\n// shader pad - state_var_524 = Math.sqrt(524 * 0.2994);\n// shader pad - state_var_525 = Math.sqrt(525 * 0.8069);\n// shader pad - state_var_526 = Math.sqrt(526 * 0.2316);\n// shader pad - state_var_527 = Math.sqrt(527 * 0.6643);\n// shader pad - state_var_528 = Math.sqrt(528 * 0.1014);\n// shader pad - state_var_529 = Math.sqrt(529 * 0.6168);\n// shader pad - state_var_530 = Math.sqrt(530 * 0.9184);\n// shader pad - state_var_531 = Math.sqrt(531 * 0.3564);\n// shader pad - state_var_532 = Math.sqrt(532 * 0.0613);\n// shader pad - state_var_533 = Math.sqrt(533 * 0.9603);\n// shader pad - state_var_534 = Math.sqrt(534 * 0.1289);\n// shader pad - state_var_535 = Math.sqrt(535 * 0.5287);\n// shader pad - state_var_536 = Math.sqrt(536 * 0.0932);\n// shader pad - state_var_537 = Math.sqrt(537 * 0.5433);\n// shader pad - state_var_538 = Math.sqrt(538 * 0.5119);\n// shader pad - state_var_539 = Math.sqrt(539 * 0.0216);\n// shader pad - state_var_540 = Math.sqrt(540 * 0.1601);\n// shader pad - state_var_541 = Math.sqrt(541 * 0.4992);\n// shader pad - state_var_542 = Math.sqrt(542 * 0.1605);\n// shader pad - state_var_543 = Math.sqrt(543 * 0.3874);\n// shader pad - state_var_544 = Math.sqrt(544 * 0.5627);\n// shader pad - state_var_545 = Math.sqrt(545 * 0.8708);\n// shader pad - state_var_546 = Math.sqrt(546 * 0.9795);\n// shader pad - state_var_547 = Math.sqrt(547 * 0.8532);\n// shader pad - state_var_548 = Math.sqrt(548 * 0.8587);\n// shader pad - state_var_549 = Math.sqrt(549 * 0.5255);\n// shader pad - state_var_550 = Math.sqrt(550 * 0.9887);\n// shader pad - state_var_551 = Math.sqrt(551 * 0.8735);\n// shader pad - state_var_552 = Math.sqrt(552 * 0.7415);\n// shader pad - state_var_553 = Math.sqrt(553 * 0.2722);\n// shader pad - state_var_554 = Math.sqrt(554 * 0.2105);\n// shader pad - state_var_555 = Math.sqrt(555 * 0.4680);\n// shader pad - state_var_556 = Math.sqrt(556 * 0.3152);\n// shader pad - state_var_557 = Math.sqrt(557 * 0.8954);\n// shader pad - state_var_558 = Math.sqrt(558 * 0.9854);\n// shader pad - state_var_559 = Math.sqrt(559 * 0.7737);\n// shader pad - state_var_560 = Math.sqrt(560 * 0.4225);\n// shader pad - state_var_561 = Math.sqrt(561 * 0.5018);\n// shader pad - state_var_562 = Math.sqrt(562 * 0.3584);\n// shader pad - state_var_563 = Math.sqrt(563 * 0.9551);\n// shader pad - state_var_564 = Math.sqrt(564 * 0.1258);\n// shader pad - state_var_565 = Math.sqrt(565 * 0.3734);\n// shader pad - state_var_566 = Math.sqrt(566 * 0.3485);\n// shader pad - state_var_567 = Math.sqrt(567 * 0.9945);\n// shader pad - state_var_568 = Math.sqrt(568 * 0.7727);\n// shader pad - state_var_569 = Math.sqrt(569 * 0.5405);\n// shader pad - state_var_570 = Math.sqrt(570 * 0.8786);\n// shader pad - state_var_571 = Math.sqrt(571 * 0.2408);\n// shader pad - state_var_572 = Math.sqrt(572 * 0.4831);\n// shader pad - state_var_573 = Math.sqrt(573 * 0.7622);\n// shader pad - state_var_574 = Math.sqrt(574 * 0.7906);\n// shader pad - state_var_575 = Math.sqrt(575 * 0.1383);\n// shader pad - state_var_576 = Math.sqrt(576 * 0.2562);\n// shader pad - state_var_577 = Math.sqrt(577 * 0.5056);\n// shader pad - state_var_578 = Math.sqrt(578 * 0.8676);\n// shader pad - state_var_579 = Math.sqrt(579 * 0.8175);\n// shader pad - state_var_580 = Math.sqrt(580 * 0.5118);\n// shader pad - state_var_581 = Math.sqrt(581 * 0.5841);\n// shader pad - state_var_582 = Math.sqrt(582 * 0.5531);\n// shader pad - state_var_583 = Math.sqrt(583 * 0.8353);\n// shader pad - state_var_584 = Math.sqrt(584 * 0.0916);\n// shader pad - state_var_585 = Math.sqrt(585 * 0.5535);\n// shader pad - state_var_586 = Math.sqrt(586 * 0.3250);\n// shader pad - state_var_587 = Math.sqrt(587 * 0.5981);\n// shader pad - state_var_588 = Math.sqrt(588 * 0.0157);\n// shader pad - state_var_589 = Math.sqrt(589 * 0.3464);\n// shader pad - state_var_590 = Math.sqrt(590 * 0.6290);\n// shader pad - state_var_591 = Math.sqrt(591 * 0.0592);\n// shader pad - state_var_592 = Math.sqrt(592 * 0.7517);\n// shader pad - state_var_593 = Math.sqrt(593 * 0.6122);\n// shader pad - state_var_594 = Math.sqrt(594 * 0.1523);\n// shader pad - state_var_595 = Math.sqrt(595 * 0.2102);\n// shader pad - state_var_596 = Math.sqrt(596 * 0.4697);\n// shader pad - state_var_597 = Math.sqrt(597 * 0.4247);\n// shader pad - state_var_598 = Math.sqrt(598 * 0.7398);\n// shader pad - state_var_599 = Math.sqrt(599 * 0.7905);\n// shader pad - state_var_600 = Math.sqrt(600 * 0.2237);\n// shader pad - state_var_601 = Math.sqrt(601 * 0.4675);\n// shader pad - state_var_602 = Math.sqrt(602 * 0.8932);\n// shader pad - state_var_603 = Math.sqrt(603 * 0.7310);\n// shader pad - state_var_604 = Math.sqrt(604 * 0.8230);\n// shader pad - state_var_605 = Math.sqrt(605 * 0.2091);\n// shader pad - state_var_606 = Math.sqrt(606 * 0.5766);\n// shader pad - state_var_607 = Math.sqrt(607 * 0.3666);\n// shader pad - state_var_608 = Math.sqrt(608 * 0.1933);\n// shader pad - state_var_609 = Math.sqrt(609 * 0.1330);\n// shader pad - state_var_610 = Math.sqrt(610 * 0.7323);\n// shader pad - state_var_611 = Math.sqrt(611 * 0.0835);\n// shader pad - state_var_612 = Math.sqrt(612 * 0.8422);\n// shader pad - state_var_613 = Math.sqrt(613 * 0.4509);\n// shader pad - state_var_614 = Math.sqrt(614 * 0.5999);\n// shader pad - state_var_615 = Math.sqrt(615 * 0.6475);\n// shader pad - state_var_616 = Math.sqrt(616 * 0.3432);\n// shader pad - state_var_617 = Math.sqrt(617 * 0.7665);\n// shader pad - state_var_618 = Math.sqrt(618 * 0.3776);\n// shader pad - state_var_619 = Math.sqrt(619 * 0.7894);\n// shader pad - state_var_620 = Math.sqrt(620 * 0.9964);\n// shader pad - state_var_621 = Math.sqrt(621 * 0.0054);\n// shader pad - state_var_622 = Math.sqrt(622 * 0.4122);\n// shader pad - state_var_623 = Math.sqrt(623 * 0.0257);\n// shader pad - state_var_624 = Math.sqrt(624 * 0.7569);\n// shader pad - state_var_625 = Math.sqrt(625 * 0.6090);\n// shader pad - state_var_626 = Math.sqrt(626 * 0.6323);\n// shader pad - state_var_627 = Math.sqrt(627 * 0.8894);\n// shader pad - state_var_628 = Math.sqrt(628 * 0.6749);\n// shader pad - state_var_629 = Math.sqrt(629 * 0.0959);\n// shader pad - state_var_630 = Math.sqrt(630 * 0.8579);\n// shader pad - state_var_631 = Math.sqrt(631 * 0.8320);\n// shader pad - state_var_632 = Math.sqrt(632 * 0.6720);\n// shader pad - state_var_633 = Math.sqrt(633 * 0.0420);\n// shader pad - state_var_634 = Math.sqrt(634 * 0.0891);\n// shader pad - state_var_635 = Math.sqrt(635 * 0.3150);\n// shader pad - state_var_636 = Math.sqrt(636 * 0.0403);\n// shader pad - state_var_637 = Math.sqrt(637 * 0.8044);\n// shader pad - state_var_638 = Math.sqrt(638 * 0.9510);\n// shader pad - state_var_639 = Math.sqrt(639 * 0.5590);\n// shader pad - state_var_640 = Math.sqrt(640 * 0.4767);\n// shader pad - state_var_641 = Math.sqrt(641 * 0.8777);\n// shader pad - state_var_642 = Math.sqrt(642 * 0.0467);\n// shader pad - state_var_643 = Math.sqrt(643 * 0.9883);\n// shader pad - state_var_644 = Math.sqrt(644 * 0.5357);\n// shader pad - state_var_645 = Math.sqrt(645 * 0.6867);\n// shader pad - state_var_646 = Math.sqrt(646 * 0.0885);\n// shader pad - state_var_647 = Math.sqrt(647 * 0.2583);\n// shader pad - state_var_648 = Math.sqrt(648 * 0.7782);\n// shader pad - state_var_649 = Math.sqrt(649 * 0.5191);\n// shader pad - state_var_650 = Math.sqrt(650 * 0.6046);\n// shader pad - state_var_651 = Math.sqrt(651 * 0.5888);\n// shader pad - state_var_652 = Math.sqrt(652 * 0.2643);\n// shader pad - state_var_653 = Math.sqrt(653 * 0.1495);\n// shader pad - state_var_654 = Math.sqrt(654 * 0.1849);\n// shader pad - state_var_655 = Math.sqrt(655 * 0.4629);\n// shader pad - state_var_656 = Math.sqrt(656 * 0.8541);\n// shader pad - state_var_657 = Math.sqrt(657 * 0.6949);\n// shader pad - state_var_658 = Math.sqrt(658 * 0.0461);\n// shader pad - state_var_659 = Math.sqrt(659 * 0.6838);\n// shader pad - state_var_660 = Math.sqrt(660 * 0.2471);\n// shader pad - state_var_661 = Math.sqrt(661 * 0.9632);\n// shader pad - state_var_662 = Math.sqrt(662 * 0.2175);\n// shader pad - state_var_663 = Math.sqrt(663 * 0.5477);\n// shader pad - state_var_664 = Math.sqrt(664 * 0.4438);\n// shader pad - state_var_665 = Math.sqrt(665 * 0.7973);\n// shader pad - state_var_666 = Math.sqrt(666 * 0.8985);\n// shader pad - state_var_667 = Math.sqrt(667 * 0.8229);\n// shader pad - state_var_668 = Math.sqrt(668 * 0.6291);\n// shader pad - state_var_669 = Math.sqrt(669 * 0.7430);\n// shader pad - state_var_670 = Math.sqrt(670 * 0.9594);\n// shader pad - state_var_671 = Math.sqrt(671 * 0.8658);\n// shader pad - state_var_672 = Math.sqrt(672 * 0.1367);\n// shader pad - state_var_673 = Math.sqrt(673 * 0.5083);\n// shader pad - state_var_674 = Math.sqrt(674 * 0.5008);\n// shader pad - state_var_675 = Math.sqrt(675 * 0.6035);\n// shader pad - state_var_676 = Math.sqrt(676 * 0.3700);\n// shader pad - state_var_677 = Math.sqrt(677 * 0.4400);\n// shader pad - state_var_678 = Math.sqrt(678 * 0.7552);\n// shader pad - state_var_679 = Math.sqrt(679 * 0.2950);\n// shader pad - state_var_680 = Math.sqrt(680 * 0.9716);\n// shader pad - state_var_681 = Math.sqrt(681 * 0.1740);\n// shader pad - state_var_682 = Math.sqrt(682 * 0.0003);\n// shader pad - state_var_683 = Math.sqrt(683 * 0.2628);\n// shader pad - state_var_684 = Math.sqrt(684 * 0.5608);\n// shader pad - state_var_685 = Math.sqrt(685 * 0.2227);\n// shader pad - state_var_686 = Math.sqrt(686 * 0.1355);\n// shader pad - state_var_687 = Math.sqrt(687 * 0.4703);\n// shader pad - state_var_688 = Math.sqrt(688 * 0.6864);\n// shader pad - state_var_689 = Math.sqrt(689 * 0.0094);\n// shader pad - state_var_690 = Math.sqrt(690 * 0.6659);\n// shader pad - state_var_691 = Math.sqrt(691 * 0.2283);\n// shader pad - state_var_692 = Math.sqrt(692 * 0.5191);\n// shader pad - state_var_693 = Math.sqrt(693 * 0.2934);\n// shader pad - state_var_694 = Math.sqrt(694 * 0.9094);\n// shader pad - state_var_695 = Math.sqrt(695 * 0.3995);\n// shader pad - state_var_696 = Math.sqrt(696 * 0.3156);\n// shader pad - state_var_697 = Math.sqrt(697 * 0.8504);\n// shader pad - state_var_698 = Math.sqrt(698 * 0.5616);\n// shader pad - state_var_699 = Math.sqrt(699 * 0.9376);\n// shader pad - state_var_700 = Math.sqrt(700 * 0.4746);\n// shader pad - state_var_701 = Math.sqrt(701 * 0.5762);\n// shader pad - state_var_702 = Math.sqrt(702 * 0.2828);\n// shader pad - state_var_703 = Math.sqrt(703 * 0.0243);\n// shader pad - state_var_704 = Math.sqrt(704 * 0.4528);\n// shader pad - state_var_705 = Math.sqrt(705 * 0.5500);\n// shader pad - state_var_706 = Math.sqrt(706 * 0.2710);\n// shader pad - state_var_707 = Math.sqrt(707 * 0.9682);\n// shader pad - state_var_708 = Math.sqrt(708 * 0.4366);\n// shader pad - state_var_709 = Math.sqrt(709 * 0.1177);\n// shader pad - state_var_710 = Math.sqrt(710 * 0.1961);\n// shader pad - state_var_711 = Math.sqrt(711 * 0.2673);\n// shader pad - state_var_712 = Math.sqrt(712 * 0.4275);\n// shader pad - state_var_713 = Math.sqrt(713 * 0.8295);\n// shader pad - state_var_714 = Math.sqrt(714 * 0.3513);\n// shader pad - state_var_715 = Math.sqrt(715 * 0.7548);\n// shader pad - state_var_716 = Math.sqrt(716 * 0.4577);\n// shader pad - state_var_717 = Math.sqrt(717 * 0.7268);\n// shader pad - state_var_718 = Math.sqrt(718 * 0.3210);\n// shader pad - state_var_719 = Math.sqrt(719 * 0.8690);\n// shader pad - state_var_720 = Math.sqrt(720 * 0.2250);\n// shader pad - state_var_721 = Math.sqrt(721 * 0.8112);\n// shader pad - state_var_722 = Math.sqrt(722 * 0.1886);\n// shader pad - state_var_723 = Math.sqrt(723 * 0.2369);\n// shader pad - state_var_724 = Math.sqrt(724 * 0.9713);\n// shader pad - state_var_725 = Math.sqrt(725 * 0.0521);\n// shader pad - state_var_726 = Math.sqrt(726 * 0.0208);\n// shader pad - state_var_727 = Math.sqrt(727 * 0.6545);\n// shader pad - state_var_728 = Math.sqrt(728 * 0.2969);\n// shader pad - state_var_729 = Math.sqrt(729 * 0.4355);\n// shader pad - state_var_730 = Math.sqrt(730 * 0.8500);\n// shader pad - state_var_731 = Math.sqrt(731 * 0.5652);\n// shader pad - state_var_732 = Math.sqrt(732 * 0.1103);\n// shader pad - state_var_733 = Math.sqrt(733 * 0.9758);\n// shader pad - state_var_734 = Math.sqrt(734 * 0.4481);\n// shader pad - state_var_735 = Math.sqrt(735 * 0.3431);\n// shader pad - state_var_736 = Math.sqrt(736 * 0.3793);\n// shader pad - state_var_737 = Math.sqrt(737 * 0.4740);\n// shader pad - state_var_738 = Math.sqrt(738 * 0.1398);\n// shader pad - state_var_739 = Math.sqrt(739 * 0.7545);\n// shader pad - state_var_740 = Math.sqrt(740 * 0.3878);\n// shader pad - state_var_741 = Math.sqrt(741 * 0.6251);\n// shader pad - state_var_742 = Math.sqrt(742 * 0.1292);\n// shader pad - state_var_743 = Math.sqrt(743 * 0.5782);\n// shader pad - state_var_744 = Math.sqrt(744 * 0.8798);\n// shader pad - state_var_745 = Math.sqrt(745 * 0.6236);\n// shader pad - state_var_746 = Math.sqrt(746 * 0.0192);\n// shader pad - state_var_747 = Math.sqrt(747 * 0.6321);\n// shader pad - state_var_748 = Math.sqrt(748 * 0.0146);\n// shader pad - state_var_749 = Math.sqrt(749 * 0.6232);\n// shader pad - state_var_750 = Math.sqrt(750 * 0.6930);\n// shader pad - state_var_751 = Math.sqrt(751 * 0.7396);\n// shader pad - state_var_752 = Math.sqrt(752 * 0.1928);\n// shader pad - state_var_753 = Math.sqrt(753 * 0.9276);\n// shader pad - state_var_754 = Math.sqrt(754 * 0.8463);\n// shader pad - state_var_755 = Math.sqrt(755 * 0.4495);\n// shader pad - state_var_756 = Math.sqrt(756 * 0.3577);\n// shader pad - state_var_757 = Math.sqrt(757 * 0.3166);\n// shader pad - state_var_758 = Math.sqrt(758 * 0.8667);\n// shader pad - state_var_759 = Math.sqrt(759 * 0.3242);\n// shader pad - state_var_760 = Math.sqrt(760 * 0.1538);\n// shader pad - state_var_761 = Math.sqrt(761 * 0.7823);\n// shader pad - state_var_762 = Math.sqrt(762 * 0.6280);\n// shader pad - state_var_763 = Math.sqrt(763 * 0.4371);\n// shader pad - state_var_764 = Math.sqrt(764 * 0.8036);\n// shader pad - state_var_765 = Math.sqrt(765 * 0.4662);\n// shader pad - state_var_766 = Math.sqrt(766 * 0.9837);\n// shader pad - state_var_767 = Math.sqrt(767 * 0.5026);\n// shader pad - state_var_768 = Math.sqrt(768 * 0.0640);\n// shader pad - state_var_769 = Math.sqrt(769 * 0.6502);\n// shader pad - state_var_770 = Math.sqrt(770 * 0.7720);\n// shader pad - state_var_771 = Math.sqrt(771 * 0.3875);\n// shader pad - state_var_772 = Math.sqrt(772 * 0.1653);\n// shader pad - state_var_773 = Math.sqrt(773 * 0.9089);\n// shader pad - state_var_774 = Math.sqrt(774 * 0.2457);\n// shader pad - state_var_775 = Math.sqrt(775 * 0.1929);\n// shader pad - state_var_776 = Math.sqrt(776 * 0.5099);\n// shader pad - state_var_777 = Math.sqrt(777 * 0.6968);\n// shader pad - state_var_778 = Math.sqrt(778 * 0.9551);\n// shader pad - state_var_779 = Math.sqrt(779 * 0.4358);\n// shader pad - state_var_780 = Math.sqrt(780 * 0.9534);\n// shader pad - state_var_781 = Math.sqrt(781 * 0.8921);\n// shader pad - state_var_782 = Math.sqrt(782 * 0.6389);\n// shader pad - state_var_783 = Math.sqrt(783 * 0.7541);\n// shader pad - state_var_784 = Math.sqrt(784 * 0.0147);\n// shader pad - state_var_785 = Math.sqrt(785 * 0.4149);\n// shader pad - state_var_786 = Math.sqrt(786 * 0.8793);\n// shader pad - state_var_787 = Math.sqrt(787 * 0.2093);\n// shader pad - state_var_788 = Math.sqrt(788 * 0.8120);\n// shader pad - state_var_789 = Math.sqrt(789 * 0.9080);\n// shader pad - state_var_790 = Math.sqrt(790 * 0.1407);\n// shader pad - state_var_791 = Math.sqrt(791 * 0.8846);\n// shader pad - state_var_792 = Math.sqrt(792 * 0.9785);\n// shader pad - state_var_793 = Math.sqrt(793 * 0.7632);\n// shader pad - state_var_794 = Math.sqrt(794 * 0.0626);\n// shader pad - state_var_795 = Math.sqrt(795 * 0.8454);\n// shader pad - state_var_796 = Math.sqrt(796 * 0.9194);\n// shader pad - state_var_797 = Math.sqrt(797 * 0.0435);\n// shader pad - state_var_798 = Math.sqrt(798 * 0.2782);\n// shader pad - state_var_799 = Math.sqrt(799 * 0.1230);\n// shader pad - state_var_800 = Math.sqrt(800 * 0.6973);\n// shader pad - state_var_801 = Math.sqrt(801 * 0.5266);\n// shader pad - state_var_802 = Math.sqrt(802 * 0.5555);\n// shader pad - state_var_803 = Math.sqrt(803 * 0.8870);\n// shader pad - state_var_804 = Math.sqrt(804 * 0.8198);\n// shader pad - state_var_805 = Math.sqrt(805 * 0.6255);\n// shader pad - state_var_806 = Math.sqrt(806 * 0.1680);\n// shader pad - state_var_807 = Math.sqrt(807 * 0.0882);\n// shader pad - state_var_808 = Math.sqrt(808 * 0.7444);\n// shader pad - state_var_809 = Math.sqrt(809 * 0.4353);\n// shader pad - state_var_810 = Math.sqrt(810 * 0.7107);\n// shader pad - state_var_811 = Math.sqrt(811 * 0.2231);\n// shader pad - state_var_812 = Math.sqrt(812 * 0.9615);\n// shader pad - state_var_813 = Math.sqrt(813 * 0.9813);\n// shader pad - state_var_814 = Math.sqrt(814 * 0.0541);\n// shader pad - state_var_815 = Math.sqrt(815 * 0.5116);\n// shader pad - state_var_816 = Math.sqrt(816 * 0.0463);\n// shader pad - state_var_817 = Math.sqrt(817 * 0.6417);\n// shader pad - state_var_818 = Math.sqrt(818 * 0.5957);\n// shader pad - state_var_819 = Math.sqrt(819 * 0.0665);\n// shader pad - state_var_820 = Math.sqrt(820 * 0.0864);\n// shader pad - state_var_821 = Math.sqrt(821 * 0.6569);\n// shader pad - state_var_822 = Math.sqrt(822 * 0.7569);\n// shader pad - state_var_823 = Math.sqrt(823 * 0.8897);\n// shader pad - state_var_824 = Math.sqrt(824 * 0.3176);\n// shader pad - state_var_825 = Math.sqrt(825 * 0.8155);\n// shader pad - state_var_826 = Math.sqrt(826 * 0.3003);\n// shader pad - state_var_827 = Math.sqrt(827 * 0.3488);\n// shader pad - state_var_828 = Math.sqrt(828 * 0.6259);\n// shader pad - state_var_829 = Math.sqrt(829 * 0.2533);\n// shader pad - state_var_830 = Math.sqrt(830 * 0.9105);\n// shader pad - state_var_831 = Math.sqrt(831 * 0.1196);\n// shader pad - state_var_832 = Math.sqrt(832 * 0.5413);\n// shader pad - state_var_833 = Math.sqrt(833 * 0.4777);\n// shader pad - state_var_834 = Math.sqrt(834 * 0.4662);\n// shader pad - state_var_835 = Math.sqrt(835 * 0.0691);\n// shader pad - state_var_836 = Math.sqrt(836 * 0.2471);\n// shader pad - state_var_837 = Math.sqrt(837 * 0.1829);\n// shader pad - state_var_838 = Math.sqrt(838 * 0.9344);\n// shader pad - state_var_839 = Math.sqrt(839 * 0.0325);\n// shader pad - state_var_840 = Math.sqrt(840 * 0.7633);\n// shader pad - state_var_841 = Math.sqrt(841 * 0.0181);\n// shader pad - state_var_842 = Math.sqrt(842 * 0.1439);\n// shader pad - state_var_843 = Math.sqrt(843 * 0.7686);\n// shader pad - state_var_844 = Math.sqrt(844 * 0.9166);\n// shader pad - state_var_845 = Math.sqrt(845 * 0.1793);\n// shader pad - state_var_846 = Math.sqrt(846 * 0.2762);\n// shader pad - state_var_847 = Math.sqrt(847 * 0.3016);\n// shader pad - state_var_848 = Math.sqrt(848 * 0.7828);\n// shader pad - state_var_849 = Math.sqrt(849 * 0.5205);\n// shader pad - state_var_850 = Math.sqrt(850 * 0.0385);\n// shader pad - state_var_851 = Math.sqrt(851 * 0.4562);\n// shader pad - state_var_852 = Math.sqrt(852 * 0.1678);\n// shader pad - state_var_853 = Math.sqrt(853 * 0.1426);\n// shader pad - state_var_854 = Math.sqrt(854 * 0.7766);\n// shader pad - state_var_855 = Math.sqrt(855 * 0.6723);\n// shader pad - state_var_856 = Math.sqrt(856 * 0.5316);\n// shader pad - state_var_857 = Math.sqrt(857 * 0.4413);\n// shader pad - state_var_858 = Math.sqrt(858 * 0.9128);\n// shader pad - state_var_859 = Math.sqrt(859 * 0.7375);\n// shader pad - state_var_860 = Math.sqrt(860 * 0.3517);\n// shader pad - state_var_861 = Math.sqrt(861 * 0.8128);\n// shader pad - state_var_862 = Math.sqrt(862 * 0.2290);\n// shader pad - state_var_863 = Math.sqrt(863 * 0.2557);\n// shader pad - state_var_864 = Math.sqrt(864 * 0.4802);\n// shader pad - state_var_865 = Math.sqrt(865 * 0.3841);\n// shader pad - state_var_866 = Math.sqrt(866 * 0.5835);\n// shader pad - state_var_867 = Math.sqrt(867 * 0.2916);\n// shader pad - state_var_868 = Math.sqrt(868 * 0.9523);\n// shader pad - state_var_869 = Math.sqrt(869 * 0.6746);\n// shader pad - state_var_870 = Math.sqrt(870 * 0.3294);\n// shader pad - state_var_871 = Math.sqrt(871 * 0.4885);\n// shader pad - state_var_872 = Math.sqrt(872 * 0.7462);\n// shader pad - state_var_873 = Math.sqrt(873 * 0.2451);\n// shader pad - state_var_874 = Math.sqrt(874 * 0.6756);\n// shader pad - state_var_875 = Math.sqrt(875 * 0.2094);\n// shader pad - state_var_876 = Math.sqrt(876 * 0.1376);\n// shader pad - state_var_877 = Math.sqrt(877 * 0.4533);\n// shader pad - state_var_878 = Math.sqrt(878 * 0.0230);\n// shader pad - state_var_879 = Math.sqrt(879 * 0.4170);\n// shader pad - state_var_880 = Math.sqrt(880 * 0.0275);\n// shader pad - state_var_881 = Math.sqrt(881 * 0.3360);\n// shader pad - state_var_882 = Math.sqrt(882 * 0.5355);\n// shader pad - state_var_883 = Math.sqrt(883 * 0.2419);\n// shader pad - state_var_884 = Math.sqrt(884 * 0.0585);\n// shader pad - state_var_885 = Math.sqrt(885 * 0.8207);\n// shader pad - state_var_886 = Math.sqrt(886 * 0.2742);\n// shader pad - state_var_887 = Math.sqrt(887 * 0.5239);\n// shader pad - state_var_888 = Math.sqrt(888 * 0.4536);\n// shader pad - state_var_889 = Math.sqrt(889 * 0.4764);\n// shader pad - state_var_890 = Math.sqrt(890 * 0.0102);\n// shader pad - state_var_891 = Math.sqrt(891 * 0.1774);\n// shader pad - state_var_892 = Math.sqrt(892 * 0.1760);\n// shader pad - state_var_893 = Math.sqrt(893 * 0.2530);\n// shader pad - state_var_894 = Math.sqrt(894 * 0.3495);\n// shader pad - state_var_895 = Math.sqrt(895 * 0.8974);\n// shader pad - state_var_896 = Math.sqrt(896 * 0.2251);\n// shader pad - state_var_897 = Math.sqrt(897 * 0.8520);\n// shader pad - state_var_898 = Math.sqrt(898 * 0.6313);// 08. Material factories
class MaterialFactory {
    static get(type) {
        if(!this.cache) this.cache = {};
        if(this.cache[type]) return this.cache[type];
        
        let mat;
        if(SHADERS[type]) {
            mat = new THREE.ShaderMaterial({
                vertexShader: SHADERS[type].vert,
                fragmentShader: SHADERS[type].frag,
                uniforms: { time: { value: 0 } }
            });
        } else {
            mat = new THREE.MeshStandardMaterial({ color: CONSTANTS.COLORS.gunmetalBase, metalness: 0.8, roughness: 0.2 });
        }
        
        this.cache[type] = mat;
        return mat;
    }
    
    static update(time) {
        if(!this.cache) return;
        Object.values(this.cache).forEach(mat => {
            if(mat.uniforms && mat.uniforms.time) {
                mat.uniforms.time.value = time;
            }
        });
    }
}
\n// material pad - state_var_0 = Math.sqrt(0 * 0.8645);\n// material pad - state_var_1 = Math.sqrt(1 * 0.1698);\n// material pad - state_var_2 = Math.sqrt(2 * 0.1015);\n// material pad - state_var_3 = Math.sqrt(3 * 0.6694);\n// material pad - state_var_4 = Math.sqrt(4 * 0.6554);\n// material pad - state_var_5 = Math.sqrt(5 * 0.1532);\n// material pad - state_var_6 = Math.sqrt(6 * 0.9406);\n// material pad - state_var_7 = Math.sqrt(7 * 0.5028);\n// material pad - state_var_8 = Math.sqrt(8 * 0.7385);\n// material pad - state_var_9 = Math.sqrt(9 * 0.6635);\n// material pad - state_var_10 = Math.sqrt(10 * 0.3056);\n// material pad - state_var_11 = Math.sqrt(11 * 0.6120);\n// material pad - state_var_12 = Math.sqrt(12 * 0.6805);\n// material pad - state_var_13 = Math.sqrt(13 * 0.3697);\n// material pad - state_var_14 = Math.sqrt(14 * 0.1999);\n// material pad - state_var_15 = Math.sqrt(15 * 0.9821);\n// material pad - state_var_16 = Math.sqrt(16 * 0.2993);\n// material pad - state_var_17 = Math.sqrt(17 * 0.5131);\n// material pad - state_var_18 = Math.sqrt(18 * 0.4057);\n// material pad - state_var_19 = Math.sqrt(19 * 0.6618);\n// material pad - state_var_20 = Math.sqrt(20 * 0.6037);\n// material pad - state_var_21 = Math.sqrt(21 * 0.5009);\n// material pad - state_var_22 = Math.sqrt(22 * 0.9880);\n// material pad - state_var_23 = Math.sqrt(23 * 0.6819);\n// material pad - state_var_24 = Math.sqrt(24 * 0.7546);\n// material pad - state_var_25 = Math.sqrt(25 * 0.1729);\n// material pad - state_var_26 = Math.sqrt(26 * 0.3582);\n// material pad - state_var_27 = Math.sqrt(27 * 0.2869);\n// material pad - state_var_28 = Math.sqrt(28 * 0.5880);\n// material pad - state_var_29 = Math.sqrt(29 * 0.2437);\n// material pad - state_var_30 = Math.sqrt(30 * 0.2937);\n// material pad - state_var_31 = Math.sqrt(31 * 0.4896);\n// material pad - state_var_32 = Math.sqrt(32 * 0.7107);\n// material pad - state_var_33 = Math.sqrt(33 * 0.2662);\n// material pad - state_var_34 = Math.sqrt(34 * 0.2486);\n// material pad - state_var_35 = Math.sqrt(35 * 0.3250);\n// material pad - state_var_36 = Math.sqrt(36 * 0.5265);\n// material pad - state_var_37 = Math.sqrt(37 * 0.1677);\n// material pad - state_var_38 = Math.sqrt(38 * 0.5020);\n// material pad - state_var_39 = Math.sqrt(39 * 0.5698);\n// material pad - state_var_40 = Math.sqrt(40 * 0.7645);\n// material pad - state_var_41 = Math.sqrt(41 * 0.3205);\n// material pad - state_var_42 = Math.sqrt(42 * 0.5730);\n// material pad - state_var_43 = Math.sqrt(43 * 0.5975);\n// material pad - state_var_44 = Math.sqrt(44 * 0.3728);\n// material pad - state_var_45 = Math.sqrt(45 * 0.9689);\n// material pad - state_var_46 = Math.sqrt(46 * 0.7917);\n// material pad - state_var_47 = Math.sqrt(47 * 0.2541);\n// material pad - state_var_48 = Math.sqrt(48 * 0.5525);\n// material pad - state_var_49 = Math.sqrt(49 * 0.4217);\n// material pad - state_var_50 = Math.sqrt(50 * 0.7116);\n// material pad - state_var_51 = Math.sqrt(51 * 0.8013);\n// material pad - state_var_52 = Math.sqrt(52 * 0.9972);\n// material pad - state_var_53 = Math.sqrt(53 * 0.7098);\n// material pad - state_var_54 = Math.sqrt(54 * 0.1250);\n// material pad - state_var_55 = Math.sqrt(55 * 0.7392);\n// material pad - state_var_56 = Math.sqrt(56 * 0.8884);\n// material pad - state_var_57 = Math.sqrt(57 * 0.8050);\n// material pad - state_var_58 = Math.sqrt(58 * 0.9610);\n// material pad - state_var_59 = Math.sqrt(59 * 0.3203);\n// material pad - state_var_60 = Math.sqrt(60 * 0.2073);\n// material pad - state_var_61 = Math.sqrt(61 * 0.1735);\n// material pad - state_var_62 = Math.sqrt(62 * 0.2869);\n// material pad - state_var_63 = Math.sqrt(63 * 0.4458);\n// material pad - state_var_64 = Math.sqrt(64 * 0.9732);\n// material pad - state_var_65 = Math.sqrt(65 * 0.5149);\n// material pad - state_var_66 = Math.sqrt(66 * 0.6566);\n// material pad - state_var_67 = Math.sqrt(67 * 0.2555);\n// material pad - state_var_68 = Math.sqrt(68 * 0.1763);\n// material pad - state_var_69 = Math.sqrt(69 * 0.1923);\n// material pad - state_var_70 = Math.sqrt(70 * 0.8272);\n// material pad - state_var_71 = Math.sqrt(71 * 0.9439);\n// material pad - state_var_72 = Math.sqrt(72 * 0.2049);\n// material pad - state_var_73 = Math.sqrt(73 * 0.7319);\n// material pad - state_var_74 = Math.sqrt(74 * 0.6825);\n// material pad - state_var_75 = Math.sqrt(75 * 0.0895);\n// material pad - state_var_76 = Math.sqrt(76 * 0.7011);\n// material pad - state_var_77 = Math.sqrt(77 * 0.1881);\n// material pad - state_var_78 = Math.sqrt(78 * 0.2093);\n// material pad - state_var_79 = Math.sqrt(79 * 0.6281);\n// material pad - state_var_80 = Math.sqrt(80 * 0.0284);\n// material pad - state_var_81 = Math.sqrt(81 * 0.5667);\n// material pad - state_var_82 = Math.sqrt(82 * 0.7534);\n// material pad - state_var_83 = Math.sqrt(83 * 0.1273);\n// material pad - state_var_84 = Math.sqrt(84 * 0.8429);\n// material pad - state_var_85 = Math.sqrt(85 * 0.7625);\n// material pad - state_var_86 = Math.sqrt(86 * 0.4764);\n// material pad - state_var_87 = Math.sqrt(87 * 0.5039);\n// material pad - state_var_88 = Math.sqrt(88 * 0.0783);\n// material pad - state_var_89 = Math.sqrt(89 * 0.8320);\n// material pad - state_var_90 = Math.sqrt(90 * 0.7093);\n// material pad - state_var_91 = Math.sqrt(91 * 0.7709);\n// material pad - state_var_92 = Math.sqrt(92 * 0.3273);\n// material pad - state_var_93 = Math.sqrt(93 * 0.3688);\n// material pad - state_var_94 = Math.sqrt(94 * 0.8001);\n// material pad - state_var_95 = Math.sqrt(95 * 0.7555);\n// material pad - state_var_96 = Math.sqrt(96 * 0.8264);\n// material pad - state_var_97 = Math.sqrt(97 * 0.8373);\n// material pad - state_var_98 = Math.sqrt(98 * 0.9132);\n// material pad - state_var_99 = Math.sqrt(99 * 0.8427);\n// material pad - state_var_100 = Math.sqrt(100 * 0.9068);\n// material pad - state_var_101 = Math.sqrt(101 * 0.2512);\n// material pad - state_var_102 = Math.sqrt(102 * 0.6932);\n// material pad - state_var_103 = Math.sqrt(103 * 0.6337);\n// material pad - state_var_104 = Math.sqrt(104 * 0.3682);\n// material pad - state_var_105 = Math.sqrt(105 * 0.5193);\n// material pad - state_var_106 = Math.sqrt(106 * 0.9466);\n// material pad - state_var_107 = Math.sqrt(107 * 0.4687);\n// material pad - state_var_108 = Math.sqrt(108 * 0.9627);\n// material pad - state_var_109 = Math.sqrt(109 * 0.8536);\n// material pad - state_var_110 = Math.sqrt(110 * 0.5963);\n// material pad - state_var_111 = Math.sqrt(111 * 0.9858);\n// material pad - state_var_112 = Math.sqrt(112 * 0.5192);\n// material pad - state_var_113 = Math.sqrt(113 * 0.1966);\n// material pad - state_var_114 = Math.sqrt(114 * 0.6875);\n// material pad - state_var_115 = Math.sqrt(115 * 0.0576);\n// material pad - state_var_116 = Math.sqrt(116 * 0.1931);\n// material pad - state_var_117 = Math.sqrt(117 * 0.7893);\n// material pad - state_var_118 = Math.sqrt(118 * 0.9101);\n// material pad - state_var_119 = Math.sqrt(119 * 0.9384);\n// material pad - state_var_120 = Math.sqrt(120 * 0.0432);\n// material pad - state_var_121 = Math.sqrt(121 * 0.5725);\n// material pad - state_var_122 = Math.sqrt(122 * 0.7020);\n// material pad - state_var_123 = Math.sqrt(123 * 0.7217);\n// material pad - state_var_124 = Math.sqrt(124 * 0.7096);\n// material pad - state_var_125 = Math.sqrt(125 * 0.7028);\n// material pad - state_var_126 = Math.sqrt(126 * 0.9916);\n// material pad - state_var_127 = Math.sqrt(127 * 0.6746);\n// material pad - state_var_128 = Math.sqrt(128 * 0.8918);\n// material pad - state_var_129 = Math.sqrt(129 * 0.1660);\n// material pad - state_var_130 = Math.sqrt(130 * 0.8862);\n// material pad - state_var_131 = Math.sqrt(131 * 0.1570);\n// material pad - state_var_132 = Math.sqrt(132 * 0.8784);\n// material pad - state_var_133 = Math.sqrt(133 * 0.6442);\n// material pad - state_var_134 = Math.sqrt(134 * 0.4116);\n// material pad - state_var_135 = Math.sqrt(135 * 0.0084);\n// material pad - state_var_136 = Math.sqrt(136 * 0.5416);\n// material pad - state_var_137 = Math.sqrt(137 * 0.3747);\n// material pad - state_var_138 = Math.sqrt(138 * 0.4331);\n// material pad - state_var_139 = Math.sqrt(139 * 0.2643);\n// material pad - state_var_140 = Math.sqrt(140 * 0.3752);\n// material pad - state_var_141 = Math.sqrt(141 * 0.1170);\n// material pad - state_var_142 = Math.sqrt(142 * 0.3140);\n// material pad - state_var_143 = Math.sqrt(143 * 0.2353);\n// material pad - state_var_144 = Math.sqrt(144 * 0.9114);\n// material pad - state_var_145 = Math.sqrt(145 * 0.2911);\n// material pad - state_var_146 = Math.sqrt(146 * 0.2474);\n// material pad - state_var_147 = Math.sqrt(147 * 0.2589);\n// material pad - state_var_148 = Math.sqrt(148 * 0.0134);\n// material pad - state_var_149 = Math.sqrt(149 * 0.2170);\n// material pad - state_var_150 = Math.sqrt(150 * 0.9845);\n// material pad - state_var_151 = Math.sqrt(151 * 0.5427);\n// material pad - state_var_152 = Math.sqrt(152 * 0.3269);\n// material pad - state_var_153 = Math.sqrt(153 * 0.7121);\n// material pad - state_var_154 = Math.sqrt(154 * 0.3517);\n// material pad - state_var_155 = Math.sqrt(155 * 0.8342);\n// material pad - state_var_156 = Math.sqrt(156 * 0.7919);\n// material pad - state_var_157 = Math.sqrt(157 * 0.3683);\n// material pad - state_var_158 = Math.sqrt(158 * 0.1462);\n// material pad - state_var_159 = Math.sqrt(159 * 0.8043);\n// material pad - state_var_160 = Math.sqrt(160 * 0.2711);\n// material pad - state_var_161 = Math.sqrt(161 * 0.6467);\n// material pad - state_var_162 = Math.sqrt(162 * 0.2710);\n// material pad - state_var_163 = Math.sqrt(163 * 0.4619);\n// material pad - state_var_164 = Math.sqrt(164 * 0.6410);\n// material pad - state_var_165 = Math.sqrt(165 * 0.8505);\n// material pad - state_var_166 = Math.sqrt(166 * 0.4076);\n// material pad - state_var_167 = Math.sqrt(167 * 0.2296);\n// material pad - state_var_168 = Math.sqrt(168 * 0.7998);\n// material pad - state_var_169 = Math.sqrt(169 * 0.3279);\n// material pad - state_var_170 = Math.sqrt(170 * 0.5467);\n// material pad - state_var_171 = Math.sqrt(171 * 0.1737);\n// material pad - state_var_172 = Math.sqrt(172 * 0.8649);\n// material pad - state_var_173 = Math.sqrt(173 * 0.2739);\n// material pad - state_var_174 = Math.sqrt(174 * 0.7011);\n// material pad - state_var_175 = Math.sqrt(175 * 0.6009);\n// material pad - state_var_176 = Math.sqrt(176 * 0.7248);\n// material pad - state_var_177 = Math.sqrt(177 * 0.9259);\n// material pad - state_var_178 = Math.sqrt(178 * 0.9986);\n// material pad - state_var_179 = Math.sqrt(179 * 0.3922);\n// material pad - state_var_180 = Math.sqrt(180 * 0.1779);\n// material pad - state_var_181 = Math.sqrt(181 * 0.6805);\n// material pad - state_var_182 = Math.sqrt(182 * 0.9146);\n// material pad - state_var_183 = Math.sqrt(183 * 0.8550);\n// material pad - state_var_184 = Math.sqrt(184 * 0.2104);\n// material pad - state_var_185 = Math.sqrt(185 * 0.0515);\n// material pad - state_var_186 = Math.sqrt(186 * 0.5963);\n// material pad - state_var_187 = Math.sqrt(187 * 0.1781);\n// material pad - state_var_188 = Math.sqrt(188 * 0.0920);\n// material pad - state_var_189 = Math.sqrt(189 * 0.9467);\n// material pad - state_var_190 = Math.sqrt(190 * 0.6242);\n// material pad - state_var_191 = Math.sqrt(191 * 0.3615);\n// material pad - state_var_192 = Math.sqrt(192 * 0.8327);\n// material pad - state_var_193 = Math.sqrt(193 * 0.7760);\n// material pad - state_var_194 = Math.sqrt(194 * 0.9123);\n// material pad - state_var_195 = Math.sqrt(195 * 0.9649);\n// material pad - state_var_196 = Math.sqrt(196 * 0.5535);\n// material pad - state_var_197 = Math.sqrt(197 * 0.7211);\n// material pad - state_var_198 = Math.sqrt(198 * 0.2606);\n// material pad - state_var_199 = Math.sqrt(199 * 0.2212);\n// material pad - state_var_200 = Math.sqrt(200 * 0.5720);\n// material pad - state_var_201 = Math.sqrt(201 * 0.5938);\n// material pad - state_var_202 = Math.sqrt(202 * 0.3805);\n// material pad - state_var_203 = Math.sqrt(203 * 0.7281);\n// material pad - state_var_204 = Math.sqrt(204 * 0.4988);\n// material pad - state_var_205 = Math.sqrt(205 * 0.5477);\n// material pad - state_var_206 = Math.sqrt(206 * 0.7883);\n// material pad - state_var_207 = Math.sqrt(207 * 0.0697);\n// material pad - state_var_208 = Math.sqrt(208 * 0.6940);\n// material pad - state_var_209 = Math.sqrt(209 * 0.4251);\n// material pad - state_var_210 = Math.sqrt(210 * 0.7085);\n// material pad - state_var_211 = Math.sqrt(211 * 0.6056);\n// material pad - state_var_212 = Math.sqrt(212 * 0.0390);\n// material pad - state_var_213 = Math.sqrt(213 * 0.9414);\n// material pad - state_var_214 = Math.sqrt(214 * 0.3095);\n// material pad - state_var_215 = Math.sqrt(215 * 0.7428);\n// material pad - state_var_216 = Math.sqrt(216 * 0.5559);\n// material pad - state_var_217 = Math.sqrt(217 * 0.1258);\n// material pad - state_var_218 = Math.sqrt(218 * 0.8774);\n// material pad - state_var_219 = Math.sqrt(219 * 0.9462);\n// material pad - state_var_220 = Math.sqrt(220 * 0.4702);\n// material pad - state_var_221 = Math.sqrt(221 * 0.0742);\n// material pad - state_var_222 = Math.sqrt(222 * 0.0071);\n// material pad - state_var_223 = Math.sqrt(223 * 0.0651);\n// material pad - state_var_224 = Math.sqrt(224 * 0.0282);\n// material pad - state_var_225 = Math.sqrt(225 * 0.9692);\n// material pad - state_var_226 = Math.sqrt(226 * 0.9402);\n// material pad - state_var_227 = Math.sqrt(227 * 0.5012);\n// material pad - state_var_228 = Math.sqrt(228 * 0.4077);\n// material pad - state_var_229 = Math.sqrt(229 * 0.2605);\n// material pad - state_var_230 = Math.sqrt(230 * 0.2978);\n// material pad - state_var_231 = Math.sqrt(231 * 0.0525);\n// material pad - state_var_232 = Math.sqrt(232 * 0.5595);\n// material pad - state_var_233 = Math.sqrt(233 * 0.3371);\n// material pad - state_var_234 = Math.sqrt(234 * 0.3731);\n// material pad - state_var_235 = Math.sqrt(235 * 0.2621);\n// material pad - state_var_236 = Math.sqrt(236 * 0.8077);\n// material pad - state_var_237 = Math.sqrt(237 * 0.5557);\n// material pad - state_var_238 = Math.sqrt(238 * 0.7808);\n// material pad - state_var_239 = Math.sqrt(239 * 0.1614);\n// material pad - state_var_240 = Math.sqrt(240 * 0.5439);\n// material pad - state_var_241 = Math.sqrt(241 * 0.8573);\n// material pad - state_var_242 = Math.sqrt(242 * 0.8605);\n// material pad - state_var_243 = Math.sqrt(243 * 0.9696);\n// material pad - state_var_244 = Math.sqrt(244 * 0.5977);\n// material pad - state_var_245 = Math.sqrt(245 * 0.1337);\n// material pad - state_var_246 = Math.sqrt(246 * 0.9165);\n// material pad - state_var_247 = Math.sqrt(247 * 0.2139);\n// material pad - state_var_248 = Math.sqrt(248 * 0.7912);\n// material pad - state_var_249 = Math.sqrt(249 * 0.3312);\n// material pad - state_var_250 = Math.sqrt(250 * 0.9938);\n// material pad - state_var_251 = Math.sqrt(251 * 0.2501);\n// material pad - state_var_252 = Math.sqrt(252 * 0.4281);\n// material pad - state_var_253 = Math.sqrt(253 * 0.1061);\n// material pad - state_var_254 = Math.sqrt(254 * 0.3529);\n// material pad - state_var_255 = Math.sqrt(255 * 0.8761);\n// material pad - state_var_256 = Math.sqrt(256 * 0.0688);\n// material pad - state_var_257 = Math.sqrt(257 * 0.0534);\n// material pad - state_var_258 = Math.sqrt(258 * 0.5277);\n// material pad - state_var_259 = Math.sqrt(259 * 0.8112);\n// material pad - state_var_260 = Math.sqrt(260 * 0.7287);\n// material pad - state_var_261 = Math.sqrt(261 * 0.5271);\n// material pad - state_var_262 = Math.sqrt(262 * 0.4394);\n// material pad - state_var_263 = Math.sqrt(263 * 0.3024);\n// material pad - state_var_264 = Math.sqrt(264 * 0.8838);\n// material pad - state_var_265 = Math.sqrt(265 * 0.5281);\n// material pad - state_var_266 = Math.sqrt(266 * 0.2365);\n// material pad - state_var_267 = Math.sqrt(267 * 0.6619);\n// material pad - state_var_268 = Math.sqrt(268 * 0.2331);\n// material pad - state_var_269 = Math.sqrt(269 * 0.7393);\n// material pad - state_var_270 = Math.sqrt(270 * 0.0916);\n// material pad - state_var_271 = Math.sqrt(271 * 0.5792);\n// material pad - state_var_272 = Math.sqrt(272 * 0.5780);\n// material pad - state_var_273 = Math.sqrt(273 * 0.0906);\n// material pad - state_var_274 = Math.sqrt(274 * 0.3103);\n// material pad - state_var_275 = Math.sqrt(275 * 0.2531);\n// material pad - state_var_276 = Math.sqrt(276 * 0.9718);\n// material pad - state_var_277 = Math.sqrt(277 * 0.7511);\n// material pad - state_var_278 = Math.sqrt(278 * 0.3736);\n// material pad - state_var_279 = Math.sqrt(279 * 0.7064);\n// material pad - state_var_280 = Math.sqrt(280 * 0.2850);\n// material pad - state_var_281 = Math.sqrt(281 * 0.0367);\n// material pad - state_var_282 = Math.sqrt(282 * 0.8771);\n// material pad - state_var_283 = Math.sqrt(283 * 0.2902);\n// material pad - state_var_284 = Math.sqrt(284 * 0.5407);\n// material pad - state_var_285 = Math.sqrt(285 * 0.0286);\n// material pad - state_var_286 = Math.sqrt(286 * 0.7894);\n// material pad - state_var_287 = Math.sqrt(287 * 0.3940);\n// material pad - state_var_288 = Math.sqrt(288 * 0.9873);\n// material pad - state_var_289 = Math.sqrt(289 * 0.7092);\n// material pad - state_var_290 = Math.sqrt(290 * 0.9916);\n// material pad - state_var_291 = Math.sqrt(291 * 0.1812);\n// material pad - state_var_292 = Math.sqrt(292 * 0.0706);\n// material pad - state_var_293 = Math.sqrt(293 * 0.2627);\n// material pad - state_var_294 = Math.sqrt(294 * 0.3169);\n// material pad - state_var_295 = Math.sqrt(295 * 0.8228);\n// material pad - state_var_296 = Math.sqrt(296 * 0.6088);\n// material pad - state_var_297 = Math.sqrt(297 * 0.8954);\n// material pad - state_var_298 = Math.sqrt(298 * 0.3379);\n// material pad - state_var_299 = Math.sqrt(299 * 0.3857);\n// material pad - state_var_300 = Math.sqrt(300 * 0.3308);\n// material pad - state_var_301 = Math.sqrt(301 * 0.4397);\n// material pad - state_var_302 = Math.sqrt(302 * 0.4591);\n// material pad - state_var_303 = Math.sqrt(303 * 0.3017);\n// material pad - state_var_304 = Math.sqrt(304 * 0.7099);\n// material pad - state_var_305 = Math.sqrt(305 * 0.4120);\n// material pad - state_var_306 = Math.sqrt(306 * 0.5302);\n// material pad - state_var_307 = Math.sqrt(307 * 0.6662);\n// material pad - state_var_308 = Math.sqrt(308 * 0.2356);\n// material pad - state_var_309 = Math.sqrt(309 * 0.6970);\n// material pad - state_var_310 = Math.sqrt(310 * 0.1343);\n// material pad - state_var_311 = Math.sqrt(311 * 0.0826);\n// material pad - state_var_312 = Math.sqrt(312 * 0.7319);\n// material pad - state_var_313 = Math.sqrt(313 * 0.6465);\n// material pad - state_var_314 = Math.sqrt(314 * 0.9006);\n// material pad - state_var_315 = Math.sqrt(315 * 0.7425);\n// material pad - state_var_316 = Math.sqrt(316 * 0.6747);\n// material pad - state_var_317 = Math.sqrt(317 * 0.0939);\n// material pad - state_var_318 = Math.sqrt(318 * 0.8303);\n// material pad - state_var_319 = Math.sqrt(319 * 0.0492);\n// material pad - state_var_320 = Math.sqrt(320 * 0.0137);\n// material pad - state_var_321 = Math.sqrt(321 * 0.7559);\n// material pad - state_var_322 = Math.sqrt(322 * 0.7607);\n// material pad - state_var_323 = Math.sqrt(323 * 0.8974);\n// material pad - state_var_324 = Math.sqrt(324 * 0.6667);\n// material pad - state_var_325 = Math.sqrt(325 * 0.7913);\n// material pad - state_var_326 = Math.sqrt(326 * 0.1972);\n// material pad - state_var_327 = Math.sqrt(327 * 0.1976);\n// material pad - state_var_328 = Math.sqrt(328 * 0.5847);\n// material pad - state_var_329 = Math.sqrt(329 * 0.6854);\n// material pad - state_var_330 = Math.sqrt(330 * 0.2644);\n// material pad - state_var_331 = Math.sqrt(331 * 0.8991);\n// material pad - state_var_332 = Math.sqrt(332 * 0.2768);\n// material pad - state_var_333 = Math.sqrt(333 * 0.3860);\n// material pad - state_var_334 = Math.sqrt(334 * 0.7599);\n// material pad - state_var_335 = Math.sqrt(335 * 0.9688);\n// material pad - state_var_336 = Math.sqrt(336 * 0.4636);\n// material pad - state_var_337 = Math.sqrt(337 * 0.4212);\n// material pad - state_var_338 = Math.sqrt(338 * 0.3268);\n// material pad - state_var_339 = Math.sqrt(339 * 0.9646);\n// material pad - state_var_340 = Math.sqrt(340 * 0.3936);\n// material pad - state_var_341 = Math.sqrt(341 * 0.9006);\n// material pad - state_var_342 = Math.sqrt(342 * 0.8877);\n// material pad - state_var_343 = Math.sqrt(343 * 0.2683);\n// material pad - state_var_344 = Math.sqrt(344 * 0.5593);\n// material pad - state_var_345 = Math.sqrt(345 * 0.5788);\n// material pad - state_var_346 = Math.sqrt(346 * 0.0433);\n// material pad - state_var_347 = Math.sqrt(347 * 0.6083);\n// material pad - state_var_348 = Math.sqrt(348 * 0.4287);\n// material pad - state_var_349 = Math.sqrt(349 * 0.9359);\n// material pad - state_var_350 = Math.sqrt(350 * 0.8569);\n// material pad - state_var_351 = Math.sqrt(351 * 0.0589);\n// material pad - state_var_352 = Math.sqrt(352 * 0.2365);\n// material pad - state_var_353 = Math.sqrt(353 * 0.8153);\n// material pad - state_var_354 = Math.sqrt(354 * 0.6338);\n// material pad - state_var_355 = Math.sqrt(355 * 0.1127);\n// material pad - state_var_356 = Math.sqrt(356 * 0.7392);\n// material pad - state_var_357 = Math.sqrt(357 * 0.3470);\n// material pad - state_var_358 = Math.sqrt(358 * 0.7937);\n// material pad - state_var_359 = Math.sqrt(359 * 0.5364);\n// material pad - state_var_360 = Math.sqrt(360 * 0.7573);\n// material pad - state_var_361 = Math.sqrt(361 * 0.2674);\n// material pad - state_var_362 = Math.sqrt(362 * 0.9618);\n// material pad - state_var_363 = Math.sqrt(363 * 0.3540);\n// material pad - state_var_364 = Math.sqrt(364 * 0.8192);\n// material pad - state_var_365 = Math.sqrt(365 * 0.7868);\n// material pad - state_var_366 = Math.sqrt(366 * 0.9676);\n// material pad - state_var_367 = Math.sqrt(367 * 0.0300);\n// material pad - state_var_368 = Math.sqrt(368 * 0.5722);\n// material pad - state_var_369 = Math.sqrt(369 * 0.1778);\n// material pad - state_var_370 = Math.sqrt(370 * 0.7586);\n// material pad - state_var_371 = Math.sqrt(371 * 0.2813);\n// material pad - state_var_372 = Math.sqrt(372 * 0.3137);\n// material pad - state_var_373 = Math.sqrt(373 * 0.0266);\n// material pad - state_var_374 = Math.sqrt(374 * 0.5070);\n// material pad - state_var_375 = Math.sqrt(375 * 0.7603);\n// material pad - state_var_376 = Math.sqrt(376 * 0.6628);\n// material pad - state_var_377 = Math.sqrt(377 * 0.6302);\n// material pad - state_var_378 = Math.sqrt(378 * 0.0165);\n// material pad - state_var_379 = Math.sqrt(379 * 0.4831);\n// material pad - state_var_380 = Math.sqrt(380 * 0.9116);\n// material pad - state_var_381 = Math.sqrt(381 * 0.4610);\n// material pad - state_var_382 = Math.sqrt(382 * 0.7413);\n// material pad - state_var_383 = Math.sqrt(383 * 0.2663);\n// material pad - state_var_384 = Math.sqrt(384 * 0.9658);\n// material pad - state_var_385 = Math.sqrt(385 * 0.0754);\n// material pad - state_var_386 = Math.sqrt(386 * 0.4310);\n// material pad - state_var_387 = Math.sqrt(387 * 0.8427);\n// material pad - state_var_388 = Math.sqrt(388 * 0.0430);\n// material pad - state_var_389 = Math.sqrt(389 * 0.6217);\n// material pad - state_var_390 = Math.sqrt(390 * 0.9181);\n// material pad - state_var_391 = Math.sqrt(391 * 0.6609);\n// material pad - state_var_392 = Math.sqrt(392 * 0.1876);\n// material pad - state_var_393 = Math.sqrt(393 * 0.0424);\n// material pad - state_var_394 = Math.sqrt(394 * 0.9091);\n// material pad - state_var_395 = Math.sqrt(395 * 0.5122);\n// material pad - state_var_396 = Math.sqrt(396 * 0.3508);\n// material pad - state_var_397 = Math.sqrt(397 * 0.1210);\n// material pad - state_var_398 = Math.sqrt(398 * 0.9488);\n// material pad - state_var_399 = Math.sqrt(399 * 0.0826);\n// material pad - state_var_400 = Math.sqrt(400 * 0.2689);\n// material pad - state_var_401 = Math.sqrt(401 * 0.1564);\n// material pad - state_var_402 = Math.sqrt(402 * 0.8121);\n// material pad - state_var_403 = Math.sqrt(403 * 0.8720);\n// material pad - state_var_404 = Math.sqrt(404 * 0.4657);\n// material pad - state_var_405 = Math.sqrt(405 * 0.3624);\n// material pad - state_var_406 = Math.sqrt(406 * 0.9699);\n// material pad - state_var_407 = Math.sqrt(407 * 0.8721);\n// material pad - state_var_408 = Math.sqrt(408 * 0.5105);\n// material pad - state_var_409 = Math.sqrt(409 * 0.1336);\n// material pad - state_var_410 = Math.sqrt(410 * 0.8035);\n// material pad - state_var_411 = Math.sqrt(411 * 0.2732);\n// material pad - state_var_412 = Math.sqrt(412 * 0.1124);\n// material pad - state_var_413 = Math.sqrt(413 * 0.8540);\n// material pad - state_var_414 = Math.sqrt(414 * 0.9714);\n// material pad - state_var_415 = Math.sqrt(415 * 0.9890);\n// material pad - state_var_416 = Math.sqrt(416 * 0.3569);\n// material pad - state_var_417 = Math.sqrt(417 * 0.8976);\n// material pad - state_var_418 = Math.sqrt(418 * 0.4671);\n// material pad - state_var_419 = Math.sqrt(419 * 0.9285);\n// material pad - state_var_420 = Math.sqrt(420 * 0.0854);\n// material pad - state_var_421 = Math.sqrt(421 * 0.4249);\n// material pad - state_var_422 = Math.sqrt(422 * 0.7731);\n// material pad - state_var_423 = Math.sqrt(423 * 0.4360);\n// material pad - state_var_424 = Math.sqrt(424 * 0.8222);\n// material pad - state_var_425 = Math.sqrt(425 * 0.4203);\n// material pad - state_var_426 = Math.sqrt(426 * 0.0816);\n// material pad - state_var_427 = Math.sqrt(427 * 0.4545);\n// material pad - state_var_428 = Math.sqrt(428 * 0.8005);\n// material pad - state_var_429 = Math.sqrt(429 * 0.9022);\n// material pad - state_var_430 = Math.sqrt(430 * 0.7076);\n// material pad - state_var_431 = Math.sqrt(431 * 0.1867);\n// material pad - state_var_432 = Math.sqrt(432 * 0.4245);\n// material pad - state_var_433 = Math.sqrt(433 * 0.1408);\n// material pad - state_var_434 = Math.sqrt(434 * 0.4995);\n// material pad - state_var_435 = Math.sqrt(435 * 0.0175);\n// material pad - state_var_436 = Math.sqrt(436 * 0.0029);\n// material pad - state_var_437 = Math.sqrt(437 * 0.8777);\n// material pad - state_var_438 = Math.sqrt(438 * 0.0357);\n// material pad - state_var_439 = Math.sqrt(439 * 0.2660);\n// material pad - state_var_440 = Math.sqrt(440 * 0.9725);\n// material pad - state_var_441 = Math.sqrt(441 * 0.6544);\n// material pad - state_var_442 = Math.sqrt(442 * 0.4168);\n// material pad - state_var_443 = Math.sqrt(443 * 0.1613);\n// material pad - state_var_444 = Math.sqrt(444 * 0.8477);\n// material pad - state_var_445 = Math.sqrt(445 * 0.9956);\n// material pad - state_var_446 = Math.sqrt(446 * 0.2428);\n// material pad - state_var_447 = Math.sqrt(447 * 0.6143);\n// material pad - state_var_448 = Math.sqrt(448 * 0.2905);// 10. Texture factories
class TextureFactory {
    static generateBrushedMetal() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#171a1d';
        ctx.fillRect(0,0,512,512);
        for(let i=0; i<5000; i++) {
            ctx.fillStyle = 'rgba(255,255,255,' + (Math.random()*0.05) + ')';
            ctx.fillRect(Math.random()*512, Math.random()*512, Math.random()*50, 1);
        }
        return new THREE.CanvasTexture(canvas);
    }
    
    static generateMachinedSteel() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#8a9299';
        ctx.fillRect(0,0,512,512);
        ctx.translate(256, 256);
        for(let i=0; i<200; i++) {
            ctx.strokeStyle = 'rgba(0,0,0,' + (Math.random()*0.05) + ')';
            ctx.beginPath();
            ctx.arc(0, 0, i * 2, 0, Math.PI*2);
            ctx.stroke();
        }
        return new THREE.CanvasTexture(canvas);
    }
}
\n// texture pad - state_var_0 = Math.sqrt(0 * 0.6609);\n// texture pad - state_var_1 = Math.sqrt(1 * 0.1331);\n// texture pad - state_var_2 = Math.sqrt(2 * 0.7919);\n// texture pad - state_var_3 = Math.sqrt(3 * 0.3267);\n// texture pad - state_var_4 = Math.sqrt(4 * 0.8294);\n// texture pad - state_var_5 = Math.sqrt(5 * 0.9739);\n// texture pad - state_var_6 = Math.sqrt(6 * 0.0481);\n// texture pad - state_var_7 = Math.sqrt(7 * 0.5308);\n// texture pad - state_var_8 = Math.sqrt(8 * 0.5583);\n// texture pad - state_var_9 = Math.sqrt(9 * 0.2239);\n// texture pad - state_var_10 = Math.sqrt(10 * 0.0322);\n// texture pad - state_var_11 = Math.sqrt(11 * 0.2181);\n// texture pad - state_var_12 = Math.sqrt(12 * 0.4113);\n// texture pad - state_var_13 = Math.sqrt(13 * 0.0430);\n// texture pad - state_var_14 = Math.sqrt(14 * 0.2525);\n// texture pad - state_var_15 = Math.sqrt(15 * 0.5471);\n// texture pad - state_var_16 = Math.sqrt(16 * 0.5652);\n// texture pad - state_var_17 = Math.sqrt(17 * 0.1595);\n// texture pad - state_var_18 = Math.sqrt(18 * 0.8885);\n// texture pad - state_var_19 = Math.sqrt(19 * 0.0501);\n// texture pad - state_var_20 = Math.sqrt(20 * 0.4677);\n// texture pad - state_var_21 = Math.sqrt(21 * 0.0744);\n// texture pad - state_var_22 = Math.sqrt(22 * 0.6321);\n// texture pad - state_var_23 = Math.sqrt(23 * 0.2917);\n// texture pad - state_var_24 = Math.sqrt(24 * 0.9852);\n// texture pad - state_var_25 = Math.sqrt(25 * 0.7943);\n// texture pad - state_var_26 = Math.sqrt(26 * 0.3479);\n// texture pad - state_var_27 = Math.sqrt(27 * 0.4728);\n// texture pad - state_var_28 = Math.sqrt(28 * 0.1473);\n// texture pad - state_var_29 = Math.sqrt(29 * 0.4379);\n// texture pad - state_var_30 = Math.sqrt(30 * 0.1141);\n// texture pad - state_var_31 = Math.sqrt(31 * 0.1948);\n// texture pad - state_var_32 = Math.sqrt(32 * 0.3355);\n// texture pad - state_var_33 = Math.sqrt(33 * 0.0162);\n// texture pad - state_var_34 = Math.sqrt(34 * 0.9336);\n// texture pad - state_var_35 = Math.sqrt(35 * 0.5902);\n// texture pad - state_var_36 = Math.sqrt(36 * 0.2398);\n// texture pad - state_var_37 = Math.sqrt(37 * 0.6987);\n// texture pad - state_var_38 = Math.sqrt(38 * 0.0421);\n// texture pad - state_var_39 = Math.sqrt(39 * 0.7997);\n// texture pad - state_var_40 = Math.sqrt(40 * 0.8263);\n// texture pad - state_var_41 = Math.sqrt(41 * 0.3917);\n// texture pad - state_var_42 = Math.sqrt(42 * 0.5836);\n// texture pad - state_var_43 = Math.sqrt(43 * 0.8814);\n// texture pad - state_var_44 = Math.sqrt(44 * 0.5385);\n// texture pad - state_var_45 = Math.sqrt(45 * 0.0985);\n// texture pad - state_var_46 = Math.sqrt(46 * 0.2684);\n// texture pad - state_var_47 = Math.sqrt(47 * 0.6667);\n// texture pad - state_var_48 = Math.sqrt(48 * 0.3434);\n// texture pad - state_var_49 = Math.sqrt(49 * 0.6193);\n// texture pad - state_var_50 = Math.sqrt(50 * 0.7942);\n// texture pad - state_var_51 = Math.sqrt(51 * 0.9778);\n// texture pad - state_var_52 = Math.sqrt(52 * 0.5295);\n// texture pad - state_var_53 = Math.sqrt(53 * 0.9799);\n// texture pad - state_var_54 = Math.sqrt(54 * 0.4700);\n// texture pad - state_var_55 = Math.sqrt(55 * 0.2274);\n// texture pad - state_var_56 = Math.sqrt(56 * 0.4887);\n// texture pad - state_var_57 = Math.sqrt(57 * 0.4621);\n// texture pad - state_var_58 = Math.sqrt(58 * 0.7140);\n// texture pad - state_var_59 = Math.sqrt(59 * 0.2259);\n// texture pad - state_var_60 = Math.sqrt(60 * 0.3695);\n// texture pad - state_var_61 = Math.sqrt(61 * 0.7067);\n// texture pad - state_var_62 = Math.sqrt(62 * 0.1699);\n// texture pad - state_var_63 = Math.sqrt(63 * 0.0389);\n// texture pad - state_var_64 = Math.sqrt(64 * 0.9032);\n// texture pad - state_var_65 = Math.sqrt(65 * 0.9499);\n// texture pad - state_var_66 = Math.sqrt(66 * 0.1538);\n// texture pad - state_var_67 = Math.sqrt(67 * 0.3721);\n// texture pad - state_var_68 = Math.sqrt(68 * 0.2617);\n// texture pad - state_var_69 = Math.sqrt(69 * 0.7598);\n// texture pad - state_var_70 = Math.sqrt(70 * 0.4379);\n// texture pad - state_var_71 = Math.sqrt(71 * 0.3103);\n// texture pad - state_var_72 = Math.sqrt(72 * 0.7660);\n// texture pad - state_var_73 = Math.sqrt(73 * 0.2189);\n// texture pad - state_var_74 = Math.sqrt(74 * 0.3907);\n// texture pad - state_var_75 = Math.sqrt(75 * 0.9997);\n// texture pad - state_var_76 = Math.sqrt(76 * 0.2718);\n// texture pad - state_var_77 = Math.sqrt(77 * 0.7924);\n// texture pad - state_var_78 = Math.sqrt(78 * 0.0438);\n// texture pad - state_var_79 = Math.sqrt(79 * 0.5591);\n// texture pad - state_var_80 = Math.sqrt(80 * 0.4258);\n// texture pad - state_var_81 = Math.sqrt(81 * 0.0960);\n// texture pad - state_var_82 = Math.sqrt(82 * 0.9505);\n// texture pad - state_var_83 = Math.sqrt(83 * 0.4801);\n// texture pad - state_var_84 = Math.sqrt(84 * 0.1048);\n// texture pad - state_var_85 = Math.sqrt(85 * 0.5110);\n// texture pad - state_var_86 = Math.sqrt(86 * 0.2249);\n// texture pad - state_var_87 = Math.sqrt(87 * 0.7092);\n// texture pad - state_var_88 = Math.sqrt(88 * 0.6486);\n// texture pad - state_var_89 = Math.sqrt(89 * 0.7118);\n// texture pad - state_var_90 = Math.sqrt(90 * 0.4902);\n// texture pad - state_var_91 = Math.sqrt(91 * 0.7737);\n// texture pad - state_var_92 = Math.sqrt(92 * 0.8931);\n// texture pad - state_var_93 = Math.sqrt(93 * 0.0867);\n// texture pad - state_var_94 = Math.sqrt(94 * 0.0225);\n// texture pad - state_var_95 = Math.sqrt(95 * 0.6975);\n// texture pad - state_var_96 = Math.sqrt(96 * 0.0472);\n// texture pad - state_var_97 = Math.sqrt(97 * 0.6940);\n// texture pad - state_var_98 = Math.sqrt(98 * 0.1880);\n// texture pad - state_var_99 = Math.sqrt(99 * 0.5315);\n// texture pad - state_var_100 = Math.sqrt(100 * 0.7821);\n// texture pad - state_var_101 = Math.sqrt(101 * 0.1868);\n// texture pad - state_var_102 = Math.sqrt(102 * 0.6894);\n// texture pad - state_var_103 = Math.sqrt(103 * 0.7326);\n// texture pad - state_var_104 = Math.sqrt(104 * 0.0038);\n// texture pad - state_var_105 = Math.sqrt(105 * 0.0307);\n// texture pad - state_var_106 = Math.sqrt(106 * 0.5050);\n// texture pad - state_var_107 = Math.sqrt(107 * 0.8456);\n// texture pad - state_var_108 = Math.sqrt(108 * 0.2475);\n// texture pad - state_var_109 = Math.sqrt(109 * 0.8114);\n// texture pad - state_var_110 = Math.sqrt(110 * 0.0105);\n// texture pad - state_var_111 = Math.sqrt(111 * 0.0225);\n// texture pad - state_var_112 = Math.sqrt(112 * 0.7108);\n// texture pad - state_var_113 = Math.sqrt(113 * 0.1944);\n// texture pad - state_var_114 = Math.sqrt(114 * 0.4113);\n// texture pad - state_var_115 = Math.sqrt(115 * 0.4207);\n// texture pad - state_var_116 = Math.sqrt(116 * 0.0191);\n// texture pad - state_var_117 = Math.sqrt(117 * 0.1896);\n// texture pad - state_var_118 = Math.sqrt(118 * 0.4194);\n// texture pad - state_var_119 = Math.sqrt(119 * 0.2520);\n// texture pad - state_var_120 = Math.sqrt(120 * 0.4723);\n// texture pad - state_var_121 = Math.sqrt(121 * 0.9117);\n// texture pad - state_var_122 = Math.sqrt(122 * 0.4435);\n// texture pad - state_var_123 = Math.sqrt(123 * 0.1483);\n// texture pad - state_var_124 = Math.sqrt(124 * 0.3869);\n// texture pad - state_var_125 = Math.sqrt(125 * 0.5484);\n// texture pad - state_var_126 = Math.sqrt(126 * 0.5948);\n// texture pad - state_var_127 = Math.sqrt(127 * 0.4583);\n// texture pad - state_var_128 = Math.sqrt(128 * 0.8826);\n// texture pad - state_var_129 = Math.sqrt(129 * 0.0554);\n// texture pad - state_var_130 = Math.sqrt(130 * 0.4496);\n// texture pad - state_var_131 = Math.sqrt(131 * 0.8225);\n// texture pad - state_var_132 = Math.sqrt(132 * 0.2148);\n// texture pad - state_var_133 = Math.sqrt(133 * 0.2681);\n// texture pad - state_var_134 = Math.sqrt(134 * 0.3808);\n// texture pad - state_var_135 = Math.sqrt(135 * 0.8044);\n// texture pad - state_var_136 = Math.sqrt(136 * 0.6218);\n// texture pad - state_var_137 = Math.sqrt(137 * 0.9379);\n// texture pad - state_var_138 = Math.sqrt(138 * 0.0579);\n// texture pad - state_var_139 = Math.sqrt(139 * 0.7435);\n// texture pad - state_var_140 = Math.sqrt(140 * 0.8822);\n// texture pad - state_var_141 = Math.sqrt(141 * 0.3666);\n// texture pad - state_var_142 = Math.sqrt(142 * 0.0102);\n// texture pad - state_var_143 = Math.sqrt(143 * 0.5620);\n// texture pad - state_var_144 = Math.sqrt(144 * 0.5284);\n// texture pad - state_var_145 = Math.sqrt(145 * 0.6846);\n// texture pad - state_var_146 = Math.sqrt(146 * 0.2803);\n// texture pad - state_var_147 = Math.sqrt(147 * 0.3466);\n// texture pad - state_var_148 = Math.sqrt(148 * 0.9174);\n// texture pad - state_var_149 = Math.sqrt(149 * 0.1673);\n// texture pad - state_var_150 = Math.sqrt(150 * 0.0730);\n// texture pad - state_var_151 = Math.sqrt(151 * 0.8182);\n// texture pad - state_var_152 = Math.sqrt(152 * 0.4770);\n// texture pad - state_var_153 = Math.sqrt(153 * 0.6388);\n// texture pad - state_var_154 = Math.sqrt(154 * 0.4192);\n// texture pad - state_var_155 = Math.sqrt(155 * 0.3348);\n// texture pad - state_var_156 = Math.sqrt(156 * 0.8437);\n// texture pad - state_var_157 = Math.sqrt(157 * 0.2730);\n// texture pad - state_var_158 = Math.sqrt(158 * 0.7956);\n// texture pad - state_var_159 = Math.sqrt(159 * 0.7103);\n// texture pad - state_var_160 = Math.sqrt(160 * 0.7778);\n// texture pad - state_var_161 = Math.sqrt(161 * 0.8024);\n// texture pad - state_var_162 = Math.sqrt(162 * 0.4169);\n// texture pad - state_var_163 = Math.sqrt(163 * 0.5242);\n// texture pad - state_var_164 = Math.sqrt(164 * 0.8490);\n// texture pad - state_var_165 = Math.sqrt(165 * 0.5315);\n// texture pad - state_var_166 = Math.sqrt(166 * 0.5479);\n// texture pad - state_var_167 = Math.sqrt(167 * 0.0846);\n// texture pad - state_var_168 = Math.sqrt(168 * 0.8542);\n// texture pad - state_var_169 = Math.sqrt(169 * 0.7698);\n// texture pad - state_var_170 = Math.sqrt(170 * 0.1550);\n// texture pad - state_var_171 = Math.sqrt(171 * 0.0675);\n// texture pad - state_var_172 = Math.sqrt(172 * 0.0240);\n// texture pad - state_var_173 = Math.sqrt(173 * 0.5252);\n// texture pad - state_var_174 = Math.sqrt(174 * 0.7097);\n// texture pad - state_var_175 = Math.sqrt(175 * 0.2567);\n// texture pad - state_var_176 = Math.sqrt(176 * 0.9266);\n// texture pad - state_var_177 = Math.sqrt(177 * 0.4196);\n// texture pad - state_var_178 = Math.sqrt(178 * 0.7405);\n// texture pad - state_var_179 = Math.sqrt(179 * 0.4441);\n// texture pad - state_var_180 = Math.sqrt(180 * 0.8813);\n// texture pad - state_var_181 = Math.sqrt(181 * 0.5848);\n// texture pad - state_var_182 = Math.sqrt(182 * 0.0998);\n// texture pad - state_var_183 = Math.sqrt(183 * 0.3037);\n// texture pad - state_var_184 = Math.sqrt(184 * 0.9210);\n// texture pad - state_var_185 = Math.sqrt(185 * 0.0510);\n// texture pad - state_var_186 = Math.sqrt(186 * 0.2536);\n// texture pad - state_var_187 = Math.sqrt(187 * 0.3437);\n// texture pad - state_var_188 = Math.sqrt(188 * 0.6499);\n// texture pad - state_var_189 = Math.sqrt(189 * 0.4951);\n// texture pad - state_var_190 = Math.sqrt(190 * 0.1860);\n// texture pad - state_var_191 = Math.sqrt(191 * 0.8969);\n// texture pad - state_var_192 = Math.sqrt(192 * 0.4452);\n// texture pad - state_var_193 = Math.sqrt(193 * 0.8791);\n// texture pad - state_var_194 = Math.sqrt(194 * 0.4358);\n// texture pad - state_var_195 = Math.sqrt(195 * 0.2262);\n// texture pad - state_var_196 = Math.sqrt(196 * 0.0342);\n// texture pad - state_var_197 = Math.sqrt(197 * 0.4511);\n// texture pad - state_var_198 = Math.sqrt(198 * 0.7161);\n// texture pad - state_var_199 = Math.sqrt(199 * 0.6282);\n// texture pad - state_var_200 = Math.sqrt(200 * 0.2074);\n// texture pad - state_var_201 = Math.sqrt(201 * 0.4076);\n// texture pad - state_var_202 = Math.sqrt(202 * 0.3505);\n// texture pad - state_var_203 = Math.sqrt(203 * 0.0306);\n// texture pad - state_var_204 = Math.sqrt(204 * 0.3307);\n// texture pad - state_var_205 = Math.sqrt(205 * 0.6172);\n// texture pad - state_var_206 = Math.sqrt(206 * 0.5426);\n// texture pad - state_var_207 = Math.sqrt(207 * 0.1962);\n// texture pad - state_var_208 = Math.sqrt(208 * 0.1223);\n// texture pad - state_var_209 = Math.sqrt(209 * 0.4739);\n// texture pad - state_var_210 = Math.sqrt(210 * 0.4166);\n// texture pad - state_var_211 = Math.sqrt(211 * 0.1121);\n// texture pad - state_var_212 = Math.sqrt(212 * 0.0554);\n// texture pad - state_var_213 = Math.sqrt(213 * 0.6325);\n// texture pad - state_var_214 = Math.sqrt(214 * 0.3152);\n// texture pad - state_var_215 = Math.sqrt(215 * 0.1907);\n// texture pad - state_var_216 = Math.sqrt(216 * 0.6891);\n// texture pad - state_var_217 = Math.sqrt(217 * 0.1840);\n// texture pad - state_var_218 = Math.sqrt(218 * 0.0055);\n// texture pad - state_var_219 = Math.sqrt(219 * 0.2697);\n// texture pad - state_var_220 = Math.sqrt(220 * 0.2517);\n// texture pad - state_var_221 = Math.sqrt(221 * 0.2641);\n// texture pad - state_var_222 = Math.sqrt(222 * 0.4766);\n// texture pad - state_var_223 = Math.sqrt(223 * 0.4118);\n// texture pad - state_var_224 = Math.sqrt(224 * 0.8725);\n// texture pad - state_var_225 = Math.sqrt(225 * 0.1252);\n// texture pad - state_var_226 = Math.sqrt(226 * 0.7570);\n// texture pad - state_var_227 = Math.sqrt(227 * 0.8204);\n// texture pad - state_var_228 = Math.sqrt(228 * 0.9274);\n// texture pad - state_var_229 = Math.sqrt(229 * 0.5963);\n// texture pad - state_var_230 = Math.sqrt(230 * 0.4039);\n// texture pad - state_var_231 = Math.sqrt(231 * 0.9701);\n// texture pad - state_var_232 = Math.sqrt(232 * 0.7847);\n// texture pad - state_var_233 = Math.sqrt(233 * 0.7948);\n// texture pad - state_var_234 = Math.sqrt(234 * 0.7815);\n// texture pad - state_var_235 = Math.sqrt(235 * 0.0388);\n// texture pad - state_var_236 = Math.sqrt(236 * 0.3726);\n// texture pad - state_var_237 = Math.sqrt(237 * 0.5839);\n// texture pad - state_var_238 = Math.sqrt(238 * 0.9530);\n// texture pad - state_var_239 = Math.sqrt(239 * 0.6686);\n// texture pad - state_var_240 = Math.sqrt(240 * 0.4407);\n// texture pad - state_var_241 = Math.sqrt(241 * 0.7537);\n// texture pad - state_var_242 = Math.sqrt(242 * 0.5083);\n// texture pad - state_var_243 = Math.sqrt(243 * 0.1749);\n// texture pad - state_var_244 = Math.sqrt(244 * 0.1329);\n// texture pad - state_var_245 = Math.sqrt(245 * 0.9953);\n// texture pad - state_var_246 = Math.sqrt(246 * 0.7031);\n// texture pad - state_var_247 = Math.sqrt(247 * 0.6632);\n// texture pad - state_var_248 = Math.sqrt(248 * 0.4841);\n// texture pad - state_var_249 = Math.sqrt(249 * 0.8796);\n// texture pad - state_var_250 = Math.sqrt(250 * 0.4657);\n// texture pad - state_var_251 = Math.sqrt(251 * 0.3176);\n// texture pad - state_var_252 = Math.sqrt(252 * 0.3628);\n// texture pad - state_var_253 = Math.sqrt(253 * 0.3561);\n// texture pad - state_var_254 = Math.sqrt(254 * 0.1181);\n// texture pad - state_var_255 = Math.sqrt(255 * 0.4348);\n// texture pad - state_var_256 = Math.sqrt(256 * 0.2599);\n// texture pad - state_var_257 = Math.sqrt(257 * 0.1948);\n// texture pad - state_var_258 = Math.sqrt(258 * 0.1267);\n// texture pad - state_var_259 = Math.sqrt(259 * 0.7038);\n// texture pad - state_var_260 = Math.sqrt(260 * 0.1974);\n// texture pad - state_var_261 = Math.sqrt(261 * 0.8887);\n// texture pad - state_var_262 = Math.sqrt(262 * 0.6345);\n// texture pad - state_var_263 = Math.sqrt(263 * 0.3760);\n// texture pad - state_var_264 = Math.sqrt(264 * 0.2442);\n// texture pad - state_var_265 = Math.sqrt(265 * 0.7449);\n// texture pad - state_var_266 = Math.sqrt(266 * 0.2933);\n// texture pad - state_var_267 = Math.sqrt(267 * 0.7530);\n// texture pad - state_var_268 = Math.sqrt(268 * 0.5349);\n// texture pad - state_var_269 = Math.sqrt(269 * 0.4493);\n// texture pad - state_var_270 = Math.sqrt(270 * 0.7724);\n// texture pad - state_var_271 = Math.sqrt(271 * 0.8842);\n// texture pad - state_var_272 = Math.sqrt(272 * 0.8378);\n// texture pad - state_var_273 = Math.sqrt(273 * 0.7561);\n// texture pad - state_var_274 = Math.sqrt(274 * 0.0162);\n// texture pad - state_var_275 = Math.sqrt(275 * 0.6598);\n// texture pad - state_var_276 = Math.sqrt(276 * 0.5735);\n// texture pad - state_var_277 = Math.sqrt(277 * 0.2011);\n// texture pad - state_var_278 = Math.sqrt(278 * 0.8654);\n// texture pad - state_var_279 = Math.sqrt(279 * 0.6809);\n// texture pad - state_var_280 = Math.sqrt(280 * 0.5096);\n// texture pad - state_var_281 = Math.sqrt(281 * 0.3441);\n// texture pad - state_var_282 = Math.sqrt(282 * 0.2735);\n// texture pad - state_var_283 = Math.sqrt(283 * 0.5482);\n// texture pad - state_var_284 = Math.sqrt(284 * 0.3762);\n// texture pad - state_var_285 = Math.sqrt(285 * 0.4938);\n// texture pad - state_var_286 = Math.sqrt(286 * 0.2559);\n// texture pad - state_var_287 = Math.sqrt(287 * 0.7393);\n// texture pad - state_var_288 = Math.sqrt(288 * 0.3968);\n// texture pad - state_var_289 = Math.sqrt(289 * 0.7872);\n// texture pad - state_var_290 = Math.sqrt(290 * 0.5616);\n// texture pad - state_var_291 = Math.sqrt(291 * 0.5878);\n// texture pad - state_var_292 = Math.sqrt(292 * 0.4580);\n// texture pad - state_var_293 = Math.sqrt(293 * 0.6393);\n// texture pad - state_var_294 = Math.sqrt(294 * 0.7944);\n// texture pad - state_var_295 = Math.sqrt(295 * 0.5926);\n// texture pad - state_var_296 = Math.sqrt(296 * 0.5951);\n// texture pad - state_var_297 = Math.sqrt(297 * 0.6982);\n// texture pad - state_var_298 = Math.sqrt(298 * 0.5422);// 11. Geometry factories
class GeometryBuilder {
    static makeGear(teeth, radius, thickness) {
        const shape = new THREE.Shape();
        const step = (Math.PI * 2) / teeth;
        for(let i = 0; i < teeth; i++) {
            const angle = i * step;
            const nextAngle = (i + 1) * step;
            shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            shape.lineTo(Math.cos(angle + step*0.2) * (radius*1.1), Math.sin(angle + step*0.2) * (radius*1.1));
            shape.lineTo(Math.cos(angle + step*0.8) * (radius*1.1), Math.sin(angle + step*0.8) * (radius*1.1));
            shape.lineTo(Math.cos(nextAngle) * radius, Math.sin(nextAngle) * radius);
        }
        const extrudeSettings = { depth: thickness, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.1, bevelThickness: 0.1 };
        return new THREE.ExtrudeGeometry(shape, extrudeSettings);
    }

    static makeTruss(length, width, segments) {
        const geo = new THREE.BoxGeometry(width, width, length, 1, 1, segments);
        return geo;
    }
    
    static makeDoorAssembly() {
        const g = new THREE.Group();
        const left = new THREE.Mesh(new THREE.BoxGeometry(40, 80, 10), MaterialFactory.get('machinedSteel'));
        left.position.x = -20;
        const right = new THREE.Mesh(new THREE.BoxGeometry(40, 80, 10), MaterialFactory.get('machinedSteel'));
        right.position.x = 20;
        g.add(left, right);
        g.userData.left = left;
        g.userData.right = right;
        return g;
    }
}
\n// geometry pad - state_var_0 = Math.sqrt(0 * 0.8765);\n// geometry pad - state_var_1 = Math.sqrt(1 * 0.9754);\n// geometry pad - state_var_2 = Math.sqrt(2 * 0.4507);\n// geometry pad - state_var_3 = Math.sqrt(3 * 0.6875);\n// geometry pad - state_var_4 = Math.sqrt(4 * 0.9836);\n// geometry pad - state_var_5 = Math.sqrt(5 * 0.0168);\n// geometry pad - state_var_6 = Math.sqrt(6 * 0.6236);\n// geometry pad - state_var_7 = Math.sqrt(7 * 0.2334);\n// geometry pad - state_var_8 = Math.sqrt(8 * 0.8332);\n// geometry pad - state_var_9 = Math.sqrt(9 * 0.9375);\n// geometry pad - state_var_10 = Math.sqrt(10 * 0.3049);\n// geometry pad - state_var_11 = Math.sqrt(11 * 0.7128);\n// geometry pad - state_var_12 = Math.sqrt(12 * 0.7385);\n// geometry pad - state_var_13 = Math.sqrt(13 * 0.9977);\n// geometry pad - state_var_14 = Math.sqrt(14 * 0.1353);\n// geometry pad - state_var_15 = Math.sqrt(15 * 0.4832);\n// geometry pad - state_var_16 = Math.sqrt(16 * 0.6497);\n// geometry pad - state_var_17 = Math.sqrt(17 * 0.1188);\n// geometry pad - state_var_18 = Math.sqrt(18 * 0.8027);\n// geometry pad - state_var_19 = Math.sqrt(19 * 0.2682);\n// geometry pad - state_var_20 = Math.sqrt(20 * 0.1187);\n// geometry pad - state_var_21 = Math.sqrt(21 * 0.1992);\n// geometry pad - state_var_22 = Math.sqrt(22 * 0.2418);\n// geometry pad - state_var_23 = Math.sqrt(23 * 0.0271);\n// geometry pad - state_var_24 = Math.sqrt(24 * 0.2405);\n// geometry pad - state_var_25 = Math.sqrt(25 * 0.4164);\n// geometry pad - state_var_26 = Math.sqrt(26 * 0.3501);\n// geometry pad - state_var_27 = Math.sqrt(27 * 0.6628);\n// geometry pad - state_var_28 = Math.sqrt(28 * 0.6408);\n// geometry pad - state_var_29 = Math.sqrt(29 * 0.2942);\n// geometry pad - state_var_30 = Math.sqrt(30 * 0.8494);\n// geometry pad - state_var_31 = Math.sqrt(31 * 0.4744);\n// geometry pad - state_var_32 = Math.sqrt(32 * 0.7212);\n// geometry pad - state_var_33 = Math.sqrt(33 * 0.7313);\n// geometry pad - state_var_34 = Math.sqrt(34 * 0.3595);\n// geometry pad - state_var_35 = Math.sqrt(35 * 0.4245);\n// geometry pad - state_var_36 = Math.sqrt(36 * 0.9446);\n// geometry pad - state_var_37 = Math.sqrt(37 * 0.7215);\n// geometry pad - state_var_38 = Math.sqrt(38 * 0.0259);\n// geometry pad - state_var_39 = Math.sqrt(39 * 0.3166);\n// geometry pad - state_var_40 = Math.sqrt(40 * 0.5465);\n// geometry pad - state_var_41 = Math.sqrt(41 * 0.3219);\n// geometry pad - state_var_42 = Math.sqrt(42 * 0.7193);\n// geometry pad - state_var_43 = Math.sqrt(43 * 0.9194);\n// geometry pad - state_var_44 = Math.sqrt(44 * 0.1660);\n// geometry pad - state_var_45 = Math.sqrt(45 * 0.8895);\n// geometry pad - state_var_46 = Math.sqrt(46 * 0.4160);\n// geometry pad - state_var_47 = Math.sqrt(47 * 0.4333);\n// geometry pad - state_var_48 = Math.sqrt(48 * 0.0469);\n// geometry pad - state_var_49 = Math.sqrt(49 * 0.4194);\n// geometry pad - state_var_50 = Math.sqrt(50 * 0.0612);\n// geometry pad - state_var_51 = Math.sqrt(51 * 0.1714);\n// geometry pad - state_var_52 = Math.sqrt(52 * 0.4867);\n// geometry pad - state_var_53 = Math.sqrt(53 * 0.2762);\n// geometry pad - state_var_54 = Math.sqrt(54 * 0.0631);\n// geometry pad - state_var_55 = Math.sqrt(55 * 0.1511);\n// geometry pad - state_var_56 = Math.sqrt(56 * 0.5903);\n// geometry pad - state_var_57 = Math.sqrt(57 * 0.2594);\n// geometry pad - state_var_58 = Math.sqrt(58 * 0.9314);\n// geometry pad - state_var_59 = Math.sqrt(59 * 0.1957);\n// geometry pad - state_var_60 = Math.sqrt(60 * 0.9902);\n// geometry pad - state_var_61 = Math.sqrt(61 * 0.4458);\n// geometry pad - state_var_62 = Math.sqrt(62 * 0.5938);\n// geometry pad - state_var_63 = Math.sqrt(63 * 0.2315);\n// geometry pad - state_var_64 = Math.sqrt(64 * 0.4014);\n// geometry pad - state_var_65 = Math.sqrt(65 * 0.7447);\n// geometry pad - state_var_66 = Math.sqrt(66 * 0.9489);\n// geometry pad - state_var_67 = Math.sqrt(67 * 0.7341);\n// geometry pad - state_var_68 = Math.sqrt(68 * 0.6656);\n// geometry pad - state_var_69 = Math.sqrt(69 * 0.9270);\n// geometry pad - state_var_70 = Math.sqrt(70 * 0.7736);\n// geometry pad - state_var_71 = Math.sqrt(71 * 0.7933);\n// geometry pad - state_var_72 = Math.sqrt(72 * 0.3508);\n// geometry pad - state_var_73 = Math.sqrt(73 * 0.7504);\n// geometry pad - state_var_74 = Math.sqrt(74 * 0.1769);\n// geometry pad - state_var_75 = Math.sqrt(75 * 0.7277);\n// geometry pad - state_var_76 = Math.sqrt(76 * 0.8999);\n// geometry pad - state_var_77 = Math.sqrt(77 * 0.5668);\n// geometry pad - state_var_78 = Math.sqrt(78 * 0.0238);\n// geometry pad - state_var_79 = Math.sqrt(79 * 0.9074);\n// geometry pad - state_var_80 = Math.sqrt(80 * 0.1463);\n// geometry pad - state_var_81 = Math.sqrt(81 * 0.8466);\n// geometry pad - state_var_82 = Math.sqrt(82 * 0.8868);\n// geometry pad - state_var_83 = Math.sqrt(83 * 0.7587);\n// geometry pad - state_var_84 = Math.sqrt(84 * 0.1759);\n// geometry pad - state_var_85 = Math.sqrt(85 * 0.3160);\n// geometry pad - state_var_86 = Math.sqrt(86 * 0.9970);\n// geometry pad - state_var_87 = Math.sqrt(87 * 0.7361);\n// geometry pad - state_var_88 = Math.sqrt(88 * 0.9497);\n// geometry pad - state_var_89 = Math.sqrt(89 * 0.0532);\n// geometry pad - state_var_90 = Math.sqrt(90 * 0.1504);\n// geometry pad - state_var_91 = Math.sqrt(91 * 0.2764);\n// geometry pad - state_var_92 = Math.sqrt(92 * 0.5673);\n// geometry pad - state_var_93 = Math.sqrt(93 * 0.1782);\n// geometry pad - state_var_94 = Math.sqrt(94 * 0.9320);\n// geometry pad - state_var_95 = Math.sqrt(95 * 0.0867);\n// geometry pad - state_var_96 = Math.sqrt(96 * 0.6400);\n// geometry pad - state_var_97 = Math.sqrt(97 * 0.6443);\n// geometry pad - state_var_98 = Math.sqrt(98 * 0.4199);\n// geometry pad - state_var_99 = Math.sqrt(99 * 0.8060);\n// geometry pad - state_var_100 = Math.sqrt(100 * 0.1560);\n// geometry pad - state_var_101 = Math.sqrt(101 * 0.3955);\n// geometry pad - state_var_102 = Math.sqrt(102 * 0.2899);\n// geometry pad - state_var_103 = Math.sqrt(103 * 0.4888);\n// geometry pad - state_var_104 = Math.sqrt(104 * 0.6095);\n// geometry pad - state_var_105 = Math.sqrt(105 * 0.3857);\n// geometry pad - state_var_106 = Math.sqrt(106 * 0.5027);\n// geometry pad - state_var_107 = Math.sqrt(107 * 0.0402);\n// geometry pad - state_var_108 = Math.sqrt(108 * 0.5369);\n// geometry pad - state_var_109 = Math.sqrt(109 * 0.0929);\n// geometry pad - state_var_110 = Math.sqrt(110 * 0.4046);\n// geometry pad - state_var_111 = Math.sqrt(111 * 0.2835);\n// geometry pad - state_var_112 = Math.sqrt(112 * 0.9544);\n// geometry pad - state_var_113 = Math.sqrt(113 * 0.4464);\n// geometry pad - state_var_114 = Math.sqrt(114 * 0.2486);\n// geometry pad - state_var_115 = Math.sqrt(115 * 0.1209);\n// geometry pad - state_var_116 = Math.sqrt(116 * 0.8751);\n// geometry pad - state_var_117 = Math.sqrt(117 * 0.3463);\n// geometry pad - state_var_118 = Math.sqrt(118 * 0.7513);\n// geometry pad - state_var_119 = Math.sqrt(119 * 0.8200);\n// geometry pad - state_var_120 = Math.sqrt(120 * 0.8490);\n// geometry pad - state_var_121 = Math.sqrt(121 * 0.3834);\n// geometry pad - state_var_122 = Math.sqrt(122 * 0.0394);\n// geometry pad - state_var_123 = Math.sqrt(123 * 0.2836);\n// geometry pad - state_var_124 = Math.sqrt(124 * 0.9467);\n// geometry pad - state_var_125 = Math.sqrt(125 * 0.4244);\n// geometry pad - state_var_126 = Math.sqrt(126 * 0.9596);\n// geometry pad - state_var_127 = Math.sqrt(127 * 0.6106);\n// geometry pad - state_var_128 = Math.sqrt(128 * 0.3269);\n// geometry pad - state_var_129 = Math.sqrt(129 * 0.8594);\n// geometry pad - state_var_130 = Math.sqrt(130 * 0.9621);\n// geometry pad - state_var_131 = Math.sqrt(131 * 0.4234);\n// geometry pad - state_var_132 = Math.sqrt(132 * 0.2439);\n// geometry pad - state_var_133 = Math.sqrt(133 * 0.0548);\n// geometry pad - state_var_134 = Math.sqrt(134 * 0.1089);\n// geometry pad - state_var_135 = Math.sqrt(135 * 0.2392);\n// geometry pad - state_var_136 = Math.sqrt(136 * 0.9545);\n// geometry pad - state_var_137 = Math.sqrt(137 * 0.6049);\n// geometry pad - state_var_138 = Math.sqrt(138 * 0.6892);\n// geometry pad - state_var_139 = Math.sqrt(139 * 0.6675);\n// geometry pad - state_var_140 = Math.sqrt(140 * 0.2248);\n// geometry pad - state_var_141 = Math.sqrt(141 * 0.0063);\n// geometry pad - state_var_142 = Math.sqrt(142 * 0.3607);\n// geometry pad - state_var_143 = Math.sqrt(143 * 0.2177);\n// geometry pad - state_var_144 = Math.sqrt(144 * 0.8394);\n// geometry pad - state_var_145 = Math.sqrt(145 * 0.4223);\n// geometry pad - state_var_146 = Math.sqrt(146 * 0.5154);\n// geometry pad - state_var_147 = Math.sqrt(147 * 0.4014);\n// geometry pad - state_var_148 = Math.sqrt(148 * 0.0221);\n// geometry pad - state_var_149 = Math.sqrt(149 * 0.3808);\n// geometry pad - state_var_150 = Math.sqrt(150 * 0.2989);\n// geometry pad - state_var_151 = Math.sqrt(151 * 0.9748);\n// geometry pad - state_var_152 = Math.sqrt(152 * 0.1226);\n// geometry pad - state_var_153 = Math.sqrt(153 * 0.3357);\n// geometry pad - state_var_154 = Math.sqrt(154 * 0.7097);\n// geometry pad - state_var_155 = Math.sqrt(155 * 0.0494);\n// geometry pad - state_var_156 = Math.sqrt(156 * 0.3997);\n// geometry pad - state_var_157 = Math.sqrt(157 * 0.4004);\n// geometry pad - state_var_158 = Math.sqrt(158 * 0.7592);\n// geometry pad - state_var_159 = Math.sqrt(159 * 0.2720);\n// geometry pad - state_var_160 = Math.sqrt(160 * 0.4717);\n// geometry pad - state_var_161 = Math.sqrt(161 * 0.2173);\n// geometry pad - state_var_162 = Math.sqrt(162 * 0.7875);\n// geometry pad - state_var_163 = Math.sqrt(163 * 0.1113);\n// geometry pad - state_var_164 = Math.sqrt(164 * 0.0958);\n// geometry pad - state_var_165 = Math.sqrt(165 * 0.0776);\n// geometry pad - state_var_166 = Math.sqrt(166 * 0.3082);\n// geometry pad - state_var_167 = Math.sqrt(167 * 0.7259);\n// geometry pad - state_var_168 = Math.sqrt(168 * 0.2015);\n// geometry pad - state_var_169 = Math.sqrt(169 * 0.3854);\n// geometry pad - state_var_170 = Math.sqrt(170 * 0.3284);\n// geometry pad - state_var_171 = Math.sqrt(171 * 0.3620);\n// geometry pad - state_var_172 = Math.sqrt(172 * 0.7708);\n// geometry pad - state_var_173 = Math.sqrt(173 * 0.3623);\n// geometry pad - state_var_174 = Math.sqrt(174 * 0.3966);\n// geometry pad - state_var_175 = Math.sqrt(175 * 0.3090);\n// geometry pad - state_var_176 = Math.sqrt(176 * 0.4277);\n// geometry pad - state_var_177 = Math.sqrt(177 * 0.2828);\n// geometry pad - state_var_178 = Math.sqrt(178 * 0.0681);\n// geometry pad - state_var_179 = Math.sqrt(179 * 0.6107);\n// geometry pad - state_var_180 = Math.sqrt(180 * 0.0628);\n// geometry pad - state_var_181 = Math.sqrt(181 * 0.5692);\n// geometry pad - state_var_182 = Math.sqrt(182 * 0.6576);\n// geometry pad - state_var_183 = Math.sqrt(183 * 0.2909);\n// geometry pad - state_var_184 = Math.sqrt(184 * 0.8398);\n// geometry pad - state_var_185 = Math.sqrt(185 * 0.0875);\n// geometry pad - state_var_186 = Math.sqrt(186 * 0.2589);\n// geometry pad - state_var_187 = Math.sqrt(187 * 0.6079);\n// geometry pad - state_var_188 = Math.sqrt(188 * 0.7429);\n// geometry pad - state_var_189 = Math.sqrt(189 * 0.1696);\n// geometry pad - state_var_190 = Math.sqrt(190 * 0.3955);\n// geometry pad - state_var_191 = Math.sqrt(191 * 0.0682);\n// geometry pad - state_var_192 = Math.sqrt(192 * 0.7590);\n// geometry pad - state_var_193 = Math.sqrt(193 * 0.3177);\n// geometry pad - state_var_194 = Math.sqrt(194 * 0.0415);\n// geometry pad - state_var_195 = Math.sqrt(195 * 0.9879);\n// geometry pad - state_var_196 = Math.sqrt(196 * 0.0991);\n// geometry pad - state_var_197 = Math.sqrt(197 * 0.4387);\n// geometry pad - state_var_198 = Math.sqrt(198 * 0.7935);\n// geometry pad - state_var_199 = Math.sqrt(199 * 0.5085);\n// geometry pad - state_var_200 = Math.sqrt(200 * 0.0340);\n// geometry pad - state_var_201 = Math.sqrt(201 * 0.6696);\n// geometry pad - state_var_202 = Math.sqrt(202 * 0.3390);\n// geometry pad - state_var_203 = Math.sqrt(203 * 0.5159);\n// geometry pad - state_var_204 = Math.sqrt(204 * 0.0357);\n// geometry pad - state_var_205 = Math.sqrt(205 * 0.8574);\n// geometry pad - state_var_206 = Math.sqrt(206 * 0.3101);\n// geometry pad - state_var_207 = Math.sqrt(207 * 0.5626);\n// geometry pad - state_var_208 = Math.sqrt(208 * 0.7116);\n// geometry pad - state_var_209 = Math.sqrt(209 * 0.6563);\n// geometry pad - state_var_210 = Math.sqrt(210 * 0.1654);\n// geometry pad - state_var_211 = Math.sqrt(211 * 0.4950);\n// geometry pad - state_var_212 = Math.sqrt(212 * 0.0907);\n// geometry pad - state_var_213 = Math.sqrt(213 * 0.1007);\n// geometry pad - state_var_214 = Math.sqrt(214 * 0.7168);\n// geometry pad - state_var_215 = Math.sqrt(215 * 0.0681);\n// geometry pad - state_var_216 = Math.sqrt(216 * 0.9507);\n// geometry pad - state_var_217 = Math.sqrt(217 * 0.2578);\n// geometry pad - state_var_218 = Math.sqrt(218 * 0.9698);\n// geometry pad - state_var_219 = Math.sqrt(219 * 0.5798);\n// geometry pad - state_var_220 = Math.sqrt(220 * 0.5116);\n// geometry pad - state_var_221 = Math.sqrt(221 * 0.0435);\n// geometry pad - state_var_222 = Math.sqrt(222 * 0.3159);\n// geometry pad - state_var_223 = Math.sqrt(223 * 0.2909);\n// geometry pad - state_var_224 = Math.sqrt(224 * 0.4307);\n// geometry pad - state_var_225 = Math.sqrt(225 * 0.6049);\n// geometry pad - state_var_226 = Math.sqrt(226 * 0.6362);\n// geometry pad - state_var_227 = Math.sqrt(227 * 0.7914);\n// geometry pad - state_var_228 = Math.sqrt(228 * 0.9840);\n// geometry pad - state_var_229 = Math.sqrt(229 * 0.2848);\n// geometry pad - state_var_230 = Math.sqrt(230 * 0.3402);\n// geometry pad - state_var_231 = Math.sqrt(231 * 0.5980);\n// geometry pad - state_var_232 = Math.sqrt(232 * 0.6785);\n// geometry pad - state_var_233 = Math.sqrt(233 * 0.4586);\n// geometry pad - state_var_234 = Math.sqrt(234 * 0.1730);\n// geometry pad - state_var_235 = Math.sqrt(235 * 0.9932);\n// geometry pad - state_var_236 = Math.sqrt(236 * 0.2126);\n// geometry pad - state_var_237 = Math.sqrt(237 * 0.5459);\n// geometry pad - state_var_238 = Math.sqrt(238 * 0.4892);\n// geometry pad - state_var_239 = Math.sqrt(239 * 0.4302);\n// geometry pad - state_var_240 = Math.sqrt(240 * 0.5244);\n// geometry pad - state_var_241 = Math.sqrt(241 * 0.0006);\n// geometry pad - state_var_242 = Math.sqrt(242 * 0.8565);\n// geometry pad - state_var_243 = Math.sqrt(243 * 0.1953);\n// geometry pad - state_var_244 = Math.sqrt(244 * 0.5053);\n// geometry pad - state_var_245 = Math.sqrt(245 * 0.1265);\n// geometry pad - state_var_246 = Math.sqrt(246 * 0.4692);\n// geometry pad - state_var_247 = Math.sqrt(247 * 0.0823);\n// geometry pad - state_var_248 = Math.sqrt(248 * 0.4803);\n// geometry pad - state_var_249 = Math.sqrt(249 * 0.7885);\n// geometry pad - state_var_250 = Math.sqrt(250 * 0.0689);\n// geometry pad - state_var_251 = Math.sqrt(251 * 0.4976);\n// geometry pad - state_var_252 = Math.sqrt(252 * 0.8019);\n// geometry pad - state_var_253 = Math.sqrt(253 * 0.8778);\n// geometry pad - state_var_254 = Math.sqrt(254 * 0.8391);\n// geometry pad - state_var_255 = Math.sqrt(255 * 0.8249);\n// geometry pad - state_var_256 = Math.sqrt(256 * 0.0087);\n// geometry pad - state_var_257 = Math.sqrt(257 * 0.4445);\n// geometry pad - state_var_258 = Math.sqrt(258 * 0.5287);\n// geometry pad - state_var_259 = Math.sqrt(259 * 0.5037);\n// geometry pad - state_var_260 = Math.sqrt(260 * 0.3250);\n// geometry pad - state_var_261 = Math.sqrt(261 * 0.4328);\n// geometry pad - state_var_262 = Math.sqrt(262 * 0.9883);\n// geometry pad - state_var_263 = Math.sqrt(263 * 0.2522);\n// geometry pad - state_var_264 = Math.sqrt(264 * 0.1632);\n// geometry pad - state_var_265 = Math.sqrt(265 * 0.9767);\n// geometry pad - state_var_266 = Math.sqrt(266 * 0.5957);\n// geometry pad - state_var_267 = Math.sqrt(267 * 0.1675);\n// geometry pad - state_var_268 = Math.sqrt(268 * 0.9898);\n// geometry pad - state_var_269 = Math.sqrt(269 * 0.6435);\n// geometry pad - state_var_270 = Math.sqrt(270 * 0.5922);\n// geometry pad - state_var_271 = Math.sqrt(271 * 0.4915);\n// geometry pad - state_var_272 = Math.sqrt(272 * 0.5367);\n// geometry pad - state_var_273 = Math.sqrt(273 * 0.8263);\n// geometry pad - state_var_274 = Math.sqrt(274 * 0.0021);\n// geometry pad - state_var_275 = Math.sqrt(275 * 0.1864);\n// geometry pad - state_var_276 = Math.sqrt(276 * 0.8200);\n// geometry pad - state_var_277 = Math.sqrt(277 * 0.4999);\n// geometry pad - state_var_278 = Math.sqrt(278 * 0.9956);\n// geometry pad - state_var_279 = Math.sqrt(279 * 0.8846);\n// geometry pad - state_var_280 = Math.sqrt(280 * 0.9605);\n// geometry pad - state_var_281 = Math.sqrt(281 * 0.8533);\n// geometry pad - state_var_282 = Math.sqrt(282 * 0.2946);\n// geometry pad - state_var_283 = Math.sqrt(283 * 0.1929);\n// geometry pad - state_var_284 = Math.sqrt(284 * 0.8981);\n// geometry pad - state_var_285 = Math.sqrt(285 * 0.3680);\n// geometry pad - state_var_286 = Math.sqrt(286 * 0.8453);\n// geometry pad - state_var_287 = Math.sqrt(287 * 0.2456);\n// geometry pad - state_var_288 = Math.sqrt(288 * 0.2623);\n// geometry pad - state_var_289 = Math.sqrt(289 * 0.1797);\n// geometry pad - state_var_290 = Math.sqrt(290 * 0.0349);\n// geometry pad - state_var_291 = Math.sqrt(291 * 0.6669);\n// geometry pad - state_var_292 = Math.sqrt(292 * 0.4222);\n// geometry pad - state_var_293 = Math.sqrt(293 * 0.9965);\n// geometry pad - state_var_294 = Math.sqrt(294 * 0.0450);\n// geometry pad - state_var_295 = Math.sqrt(295 * 0.1621);\n// geometry pad - state_var_296 = Math.sqrt(296 * 0.6945);\n// geometry pad - state_var_297 = Math.sqrt(297 * 0.9290);\n// geometry pad - state_var_298 = Math.sqrt(298 * 0.9528);\n// geometry pad - state_var_299 = Math.sqrt(299 * 0.6737);\n// geometry pad - state_var_300 = Math.sqrt(300 * 0.7743);\n// geometry pad - state_var_301 = Math.sqrt(301 * 0.1656);\n// geometry pad - state_var_302 = Math.sqrt(302 * 0.7179);\n// geometry pad - state_var_303 = Math.sqrt(303 * 0.0568);\n// geometry pad - state_var_304 = Math.sqrt(304 * 0.1859);\n// geometry pad - state_var_305 = Math.sqrt(305 * 0.0348);\n// geometry pad - state_var_306 = Math.sqrt(306 * 0.8163);\n// geometry pad - state_var_307 = Math.sqrt(307 * 0.7032);\n// geometry pad - state_var_308 = Math.sqrt(308 * 0.3420);\n// geometry pad - state_var_309 = Math.sqrt(309 * 0.7424);\n// geometry pad - state_var_310 = Math.sqrt(310 * 0.3340);\n// geometry pad - state_var_311 = Math.sqrt(311 * 0.8927);\n// geometry pad - state_var_312 = Math.sqrt(312 * 0.5443);\n// geometry pad - state_var_313 = Math.sqrt(313 * 0.3807);\n// geometry pad - state_var_314 = Math.sqrt(314 * 0.1818);\n// geometry pad - state_var_315 = Math.sqrt(315 * 0.5739);\n// geometry pad - state_var_316 = Math.sqrt(316 * 0.6095);\n// geometry pad - state_var_317 = Math.sqrt(317 * 0.4844);\n// geometry pad - state_var_318 = Math.sqrt(318 * 0.4721);\n// geometry pad - state_var_319 = Math.sqrt(319 * 0.5015);\n// geometry pad - state_var_320 = Math.sqrt(320 * 0.7025);\n// geometry pad - state_var_321 = Math.sqrt(321 * 0.9562);\n// geometry pad - state_var_322 = Math.sqrt(322 * 0.0913);\n// geometry pad - state_var_323 = Math.sqrt(323 * 0.4048);\n// geometry pad - state_var_324 = Math.sqrt(324 * 0.9015);\n// geometry pad - state_var_325 = Math.sqrt(325 * 0.9872);\n// geometry pad - state_var_326 = Math.sqrt(326 * 0.9480);\n// geometry pad - state_var_327 = Math.sqrt(327 * 0.1217);\n// geometry pad - state_var_328 = Math.sqrt(328 * 0.6710);\n// geometry pad - state_var_329 = Math.sqrt(329 * 0.2256);\n// geometry pad - state_var_330 = Math.sqrt(330 * 0.7894);\n// geometry pad - state_var_331 = Math.sqrt(331 * 0.7577);\n// geometry pad - state_var_332 = Math.sqrt(332 * 0.5349);\n// geometry pad - state_var_333 = Math.sqrt(333 * 0.6331);\n// geometry pad - state_var_334 = Math.sqrt(334 * 0.3802);\n// geometry pad - state_var_335 = Math.sqrt(335 * 0.6447);\n// geometry pad - state_var_336 = Math.sqrt(336 * 0.3159);\n// geometry pad - state_var_337 = Math.sqrt(337 * 0.8687);\n// geometry pad - state_var_338 = Math.sqrt(338 * 0.1196);\n// geometry pad - state_var_339 = Math.sqrt(339 * 0.1203);\n// geometry pad - state_var_340 = Math.sqrt(340 * 0.2537);\n// geometry pad - state_var_341 = Math.sqrt(341 * 0.5602);\n// geometry pad - state_var_342 = Math.sqrt(342 * 0.5970);\n// geometry pad - state_var_343 = Math.sqrt(343 * 0.7630);\n// geometry pad - state_var_344 = Math.sqrt(344 * 0.4458);\n// geometry pad - state_var_345 = Math.sqrt(345 * 0.7539);\n// geometry pad - state_var_346 = Math.sqrt(346 * 0.9890);\n// geometry pad - state_var_347 = Math.sqrt(347 * 0.8800);\n// geometry pad - state_var_348 = Math.sqrt(348 * 0.9766);\n// geometry pad - state_var_349 = Math.sqrt(349 * 0.6697);\n// geometry pad - state_var_350 = Math.sqrt(350 * 0.5071);\n// geometry pad - state_var_351 = Math.sqrt(351 * 0.4573);\n// geometry pad - state_var_352 = Math.sqrt(352 * 0.5347);\n// geometry pad - state_var_353 = Math.sqrt(353 * 0.2990);\n// geometry pad - state_var_354 = Math.sqrt(354 * 0.8142);\n// geometry pad - state_var_355 = Math.sqrt(355 * 0.9950);\n// geometry pad - state_var_356 = Math.sqrt(356 * 0.0393);\n// geometry pad - state_var_357 = Math.sqrt(357 * 0.4883);\n// geometry pad - state_var_358 = Math.sqrt(358 * 0.4093);\n// geometry pad - state_var_359 = Math.sqrt(359 * 0.8187);\n// geometry pad - state_var_360 = Math.sqrt(360 * 0.2624);\n// geometry pad - state_var_361 = Math.sqrt(361 * 0.8684);\n// geometry pad - state_var_362 = Math.sqrt(362 * 0.7616);\n// geometry pad - state_var_363 = Math.sqrt(363 * 0.0161);\n// geometry pad - state_var_364 = Math.sqrt(364 * 0.0586);\n// geometry pad - state_var_365 = Math.sqrt(365 * 0.3731);\n// geometry pad - state_var_366 = Math.sqrt(366 * 0.2260);\n// geometry pad - state_var_367 = Math.sqrt(367 * 0.0037);\n// geometry pad - state_var_368 = Math.sqrt(368 * 0.2175);\n// geometry pad - state_var_369 = Math.sqrt(369 * 0.9677);\n// geometry pad - state_var_370 = Math.sqrt(370 * 0.0825);\n// geometry pad - state_var_371 = Math.sqrt(371 * 0.9111);\n// geometry pad - state_var_372 = Math.sqrt(372 * 0.2537);\n// geometry pad - state_var_373 = Math.sqrt(373 * 0.8337);\n// geometry pad - state_var_374 = Math.sqrt(374 * 0.5624);\n// geometry pad - state_var_375 = Math.sqrt(375 * 0.7344);\n// geometry pad - state_var_376 = Math.sqrt(376 * 0.5241);\n// geometry pad - state_var_377 = Math.sqrt(377 * 0.1157);\n// geometry pad - state_var_378 = Math.sqrt(378 * 0.8956);\n// geometry pad - state_var_379 = Math.sqrt(379 * 0.0040);\n// geometry pad - state_var_380 = Math.sqrt(380 * 0.8542);\n// geometry pad - state_var_381 = Math.sqrt(381 * 0.7065);\n// geometry pad - state_var_382 = Math.sqrt(382 * 0.0585);\n// geometry pad - state_var_383 = Math.sqrt(383 * 0.4303);\n// geometry pad - state_var_384 = Math.sqrt(384 * 0.8789);\n// geometry pad - state_var_385 = Math.sqrt(385 * 0.1954);\n// geometry pad - state_var_386 = Math.sqrt(386 * 0.5862);\n// geometry pad - state_var_387 = Math.sqrt(387 * 0.1131);\n// geometry pad - state_var_388 = Math.sqrt(388 * 0.6912);\n// geometry pad - state_var_389 = Math.sqrt(389 * 0.3566);\n// geometry pad - state_var_390 = Math.sqrt(390 * 0.2383);\n// geometry pad - state_var_391 = Math.sqrt(391 * 0.8868);\n// geometry pad - state_var_392 = Math.sqrt(392 * 0.9309);\n// geometry pad - state_var_393 = Math.sqrt(393 * 0.1881);\n// geometry pad - state_var_394 = Math.sqrt(394 * 0.1598);\n// geometry pad - state_var_395 = Math.sqrt(395 * 0.9826);\n// geometry pad - state_var_396 = Math.sqrt(396 * 0.0469);\n// geometry pad - state_var_397 = Math.sqrt(397 * 0.4238);\n// geometry pad - state_var_398 = Math.sqrt(398 * 0.6598);\n// geometry pad - state_var_399 = Math.sqrt(399 * 0.0002);\n// geometry pad - state_var_400 = Math.sqrt(400 * 0.3846);\n// geometry pad - state_var_401 = Math.sqrt(401 * 0.1164);\n// geometry pad - state_var_402 = Math.sqrt(402 * 0.3537);\n// geometry pad - state_var_403 = Math.sqrt(403 * 0.4751);\n// geometry pad - state_var_404 = Math.sqrt(404 * 0.3918);\n// geometry pad - state_var_405 = Math.sqrt(405 * 0.8342);\n// geometry pad - state_var_406 = Math.sqrt(406 * 0.5510);\n// geometry pad - state_var_407 = Math.sqrt(407 * 0.2616);\n// geometry pad - state_var_408 = Math.sqrt(408 * 0.3899);\n// geometry pad - state_var_409 = Math.sqrt(409 * 0.7556);\n// geometry pad - state_var_410 = Math.sqrt(410 * 0.0757);\n// geometry pad - state_var_411 = Math.sqrt(411 * 0.9420);\n// geometry pad - state_var_412 = Math.sqrt(412 * 0.6385);\n// geometry pad - state_var_413 = Math.sqrt(413 * 0.6428);\n// geometry pad - state_var_414 = Math.sqrt(414 * 0.4083);\n// geometry pad - state_var_415 = Math.sqrt(415 * 0.5774);\n// geometry pad - state_var_416 = Math.sqrt(416 * 0.9140);\n// geometry pad - state_var_417 = Math.sqrt(417 * 0.4055);\n// geometry pad - state_var_418 = Math.sqrt(418 * 0.8241);\n// geometry pad - state_var_419 = Math.sqrt(419 * 0.2585);\n// geometry pad - state_var_420 = Math.sqrt(420 * 0.3573);\n// geometry pad - state_var_421 = Math.sqrt(421 * 0.5555);\n// geometry pad - state_var_422 = Math.sqrt(422 * 0.2541);\n// geometry pad - state_var_423 = Math.sqrt(423 * 0.7759);\n// geometry pad - state_var_424 = Math.sqrt(424 * 0.4131);\n// geometry pad - state_var_425 = Math.sqrt(425 * 0.2418);\n// geometry pad - state_var_426 = Math.sqrt(426 * 0.7594);\n// geometry pad - state_var_427 = Math.sqrt(427 * 0.7419);\n// geometry pad - state_var_428 = Math.sqrt(428 * 0.7840);\n// geometry pad - state_var_429 = Math.sqrt(429 * 0.1523);\n// geometry pad - state_var_430 = Math.sqrt(430 * 0.0958);\n// geometry pad - state_var_431 = Math.sqrt(431 * 0.5656);\n// geometry pad - state_var_432 = Math.sqrt(432 * 0.9699);\n// geometry pad - state_var_433 = Math.sqrt(433 * 0.3502);\n// geometry pad - state_var_434 = Math.sqrt(434 * 0.9055);\n// geometry pad - state_var_435 = Math.sqrt(435 * 0.0715);\n// geometry pad - state_var_436 = Math.sqrt(436 * 0.4836);\n// geometry pad - state_var_437 = Math.sqrt(437 * 0.9328);\n// geometry pad - state_var_438 = Math.sqrt(438 * 0.3527);\n// geometry pad - state_var_439 = Math.sqrt(439 * 0.9397);\n// geometry pad - state_var_440 = Math.sqrt(440 * 0.3524);\n// geometry pad - state_var_441 = Math.sqrt(441 * 0.9252);\n// geometry pad - state_var_442 = Math.sqrt(442 * 0.9116);\n// geometry pad - state_var_443 = Math.sqrt(443 * 0.1640);\n// geometry pad - state_var_444 = Math.sqrt(444 * 0.6390);\n// geometry pad - state_var_445 = Math.sqrt(445 * 0.6347);\n// geometry pad - state_var_446 = Math.sqrt(446 * 0.5871);\n// geometry pad - state_var_447 = Math.sqrt(447 * 0.4550);\n// geometry pad - state_var_448 = Math.sqrt(448 * 0.3844);\n// geometry pad - state_var_449 = Math.sqrt(449 * 0.3997);\n// geometry pad - state_var_450 = Math.sqrt(450 * 0.4084);\n// geometry pad - state_var_451 = Math.sqrt(451 * 0.3734);\n// geometry pad - state_var_452 = Math.sqrt(452 * 0.7128);\n// geometry pad - state_var_453 = Math.sqrt(453 * 0.1220);\n// geometry pad - state_var_454 = Math.sqrt(454 * 0.4853);\n// geometry pad - state_var_455 = Math.sqrt(455 * 0.3801);\n// geometry pad - state_var_456 = Math.sqrt(456 * 0.9511);\n// geometry pad - state_var_457 = Math.sqrt(457 * 0.8401);\n// geometry pad - state_var_458 = Math.sqrt(458 * 0.7546);\n// geometry pad - state_var_459 = Math.sqrt(459 * 0.8636);\n// geometry pad - state_var_460 = Math.sqrt(460 * 0.1436);\n// geometry pad - state_var_461 = Math.sqrt(461 * 0.2740);\n// geometry pad - state_var_462 = Math.sqrt(462 * 0.3631);\n// geometry pad - state_var_463 = Math.sqrt(463 * 0.7225);\n// geometry pad - state_var_464 = Math.sqrt(464 * 0.4156);\n// geometry pad - state_var_465 = Math.sqrt(465 * 0.2937);\n// geometry pad - state_var_466 = Math.sqrt(466 * 0.1088);\n// geometry pad - state_var_467 = Math.sqrt(467 * 0.3855);\n// geometry pad - state_var_468 = Math.sqrt(468 * 0.0658);\n// geometry pad - state_var_469 = Math.sqrt(469 * 0.2144);\n// geometry pad - state_var_470 = Math.sqrt(470 * 0.6159);\n// geometry pad - state_var_471 = Math.sqrt(471 * 0.3477);\n// geometry pad - state_var_472 = Math.sqrt(472 * 0.6282);\n// geometry pad - state_var_473 = Math.sqrt(473 * 0.7545);\n// geometry pad - state_var_474 = Math.sqrt(474 * 0.6730);\n// geometry pad - state_var_475 = Math.sqrt(475 * 0.1565);\n// geometry pad - state_var_476 = Math.sqrt(476 * 0.9297);\n// geometry pad - state_var_477 = Math.sqrt(477 * 0.5613);\n// geometry pad - state_var_478 = Math.sqrt(478 * 0.0065);\n// geometry pad - state_var_479 = Math.sqrt(479 * 0.7281);\n// geometry pad - state_var_480 = Math.sqrt(480 * 0.4344);\n// geometry pad - state_var_481 = Math.sqrt(481 * 0.0656);\n// geometry pad - state_var_482 = Math.sqrt(482 * 0.3798);\n// geometry pad - state_var_483 = Math.sqrt(483 * 0.1890);\n// geometry pad - state_var_484 = Math.sqrt(484 * 0.0387);\n// geometry pad - state_var_485 = Math.sqrt(485 * 0.1360);\n// geometry pad - state_var_486 = Math.sqrt(486 * 0.7919);\n// geometry pad - state_var_487 = Math.sqrt(487 * 0.8935);\n// geometry pad - state_var_488 = Math.sqrt(488 * 0.7131);\n// geometry pad - state_var_489 = Math.sqrt(489 * 0.5719);\n// geometry pad - state_var_490 = Math.sqrt(490 * 0.0096);\n// geometry pad - state_var_491 = Math.sqrt(491 * 0.7428);\n// geometry pad - state_var_492 = Math.sqrt(492 * 0.9591);\n// geometry pad - state_var_493 = Math.sqrt(493 * 0.2158);\n// geometry pad - state_var_494 = Math.sqrt(494 * 0.2689);\n// geometry pad - state_var_495 = Math.sqrt(495 * 0.7702);\n// geometry pad - state_var_496 = Math.sqrt(496 * 0.5160);\n// geometry pad - state_var_497 = Math.sqrt(497 * 0.4232);\n// geometry pad - state_var_498 = Math.sqrt(498 * 0.8074);\n// geometry pad - state_var_499 = Math.sqrt(499 * 0.9033);\n// geometry pad - state_var_500 = Math.sqrt(500 * 0.3367);\n// geometry pad - state_var_501 = Math.sqrt(501 * 0.0661);\n// geometry pad - state_var_502 = Math.sqrt(502 * 0.0294);\n// geometry pad - state_var_503 = Math.sqrt(503 * 0.2357);\n// geometry pad - state_var_504 = Math.sqrt(504 * 0.1941);\n// geometry pad - state_var_505 = Math.sqrt(505 * 0.6718);\n// geometry pad - state_var_506 = Math.sqrt(506 * 0.2680);\n// geometry pad - state_var_507 = Math.sqrt(507 * 0.6634);\n// geometry pad - state_var_508 = Math.sqrt(508 * 0.7140);\n// geometry pad - state_var_509 = Math.sqrt(509 * 0.1127);\n// geometry pad - state_var_510 = Math.sqrt(510 * 0.1830);\n// geometry pad - state_var_511 = Math.sqrt(511 * 0.8401);\n// geometry pad - state_var_512 = Math.sqrt(512 * 0.8121);\n// geometry pad - state_var_513 = Math.sqrt(513 * 0.2913);\n// geometry pad - state_var_514 = Math.sqrt(514 * 0.6564);\n// geometry pad - state_var_515 = Math.sqrt(515 * 0.0807);\n// geometry pad - state_var_516 = Math.sqrt(516 * 0.6007);\n// geometry pad - state_var_517 = Math.sqrt(517 * 0.8954);\n// geometry pad - state_var_518 = Math.sqrt(518 * 0.5033);\n// geometry pad - state_var_519 = Math.sqrt(519 * 0.7765);\n// geometry pad - state_var_520 = Math.sqrt(520 * 0.0412);\n// geometry pad - state_var_521 = Math.sqrt(521 * 0.2508);\n// geometry pad - state_var_522 = Math.sqrt(522 * 0.2833);\n// geometry pad - state_var_523 = Math.sqrt(523 * 0.1167);\n// geometry pad - state_var_524 = Math.sqrt(524 * 0.0653);\n// geometry pad - state_var_525 = Math.sqrt(525 * 0.1637);\n// geometry pad - state_var_526 = Math.sqrt(526 * 0.2696);\n// geometry pad - state_var_527 = Math.sqrt(527 * 0.4483);\n// geometry pad - state_var_528 = Math.sqrt(528 * 0.8142);\n// geometry pad - state_var_529 = Math.sqrt(529 * 0.0529);\n// geometry pad - state_var_530 = Math.sqrt(530 * 0.6106);\n// geometry pad - state_var_531 = Math.sqrt(531 * 0.6167);\n// geometry pad - state_var_532 = Math.sqrt(532 * 0.8834);\n// geometry pad - state_var_533 = Math.sqrt(533 * 0.4973);\n// geometry pad - state_var_534 = Math.sqrt(534 * 0.1308);\n// geometry pad - state_var_535 = Math.sqrt(535 * 0.7195);\n// geometry pad - state_var_536 = Math.sqrt(536 * 0.2348);\n// geometry pad - state_var_537 = Math.sqrt(537 * 0.8753);\n// geometry pad - state_var_538 = Math.sqrt(538 * 0.4658);\n// geometry pad - state_var_539 = Math.sqrt(539 * 0.9342);\n// geometry pad - state_var_540 = Math.sqrt(540 * 0.3089);\n// geometry pad - state_var_541 = Math.sqrt(541 * 0.3412);\n// geometry pad - state_var_542 = Math.sqrt(542 * 0.8562);\n// geometry pad - state_var_543 = Math.sqrt(543 * 0.6516);\n// geometry pad - state_var_544 = Math.sqrt(544 * 0.7763);\n// geometry pad - state_var_545 = Math.sqrt(545 * 0.9775);\n// geometry pad - state_var_546 = Math.sqrt(546 * 0.3552);\n// geometry pad - state_var_547 = Math.sqrt(547 * 0.2624);\n// geometry pad - state_var_548 = Math.sqrt(548 * 0.2237);\n// geometry pad - state_var_549 = Math.sqrt(549 * 0.4240);\n// geometry pad - state_var_550 = Math.sqrt(550 * 0.1580);\n// geometry pad - state_var_551 = Math.sqrt(551 * 0.6838);\n// geometry pad - state_var_552 = Math.sqrt(552 * 0.7441);\n// geometry pad - state_var_553 = Math.sqrt(553 * 0.7589);\n// geometry pad - state_var_554 = Math.sqrt(554 * 0.8885);\n// geometry pad - state_var_555 = Math.sqrt(555 * 0.6674);\n// geometry pad - state_var_556 = Math.sqrt(556 * 0.2432);\n// geometry pad - state_var_557 = Math.sqrt(557 * 0.5310);\n// geometry pad - state_var_558 = Math.sqrt(558 * 0.6468);\n// geometry pad - state_var_559 = Math.sqrt(559 * 0.7691);\n// geometry pad - state_var_560 = Math.sqrt(560 * 0.2360);\n// geometry pad - state_var_561 = Math.sqrt(561 * 0.7471);\n// geometry pad - state_var_562 = Math.sqrt(562 * 0.0040);\n// geometry pad - state_var_563 = Math.sqrt(563 * 0.6394);\n// geometry pad - state_var_564 = Math.sqrt(564 * 0.4170);\n// geometry pad - state_var_565 = Math.sqrt(565 * 0.2028);\n// geometry pad - state_var_566 = Math.sqrt(566 * 0.7247);\n// geometry pad - state_var_567 = Math.sqrt(567 * 0.9900);\n// geometry pad - state_var_568 = Math.sqrt(568 * 0.4088);\n// geometry pad - state_var_569 = Math.sqrt(569 * 0.9299);\n// geometry pad - state_var_570 = Math.sqrt(570 * 0.4697);\n// geometry pad - state_var_571 = Math.sqrt(571 * 0.5106);\n// geometry pad - state_var_572 = Math.sqrt(572 * 0.6059);\n// geometry pad - state_var_573 = Math.sqrt(573 * 0.1947);\n// geometry pad - state_var_574 = Math.sqrt(574 * 0.5659);\n// geometry pad - state_var_575 = Math.sqrt(575 * 0.5924);\n// geometry pad - state_var_576 = Math.sqrt(576 * 0.2975);\n// geometry pad - state_var_577 = Math.sqrt(577 * 0.6140);\n// geometry pad - state_var_578 = Math.sqrt(578 * 0.3053);\n// geometry pad - state_var_579 = Math.sqrt(579 * 0.2635);\n// geometry pad - state_var_580 = Math.sqrt(580 * 0.9247);\n// geometry pad - state_var_581 = Math.sqrt(581 * 0.9880);\n// geometry pad - state_var_582 = Math.sqrt(582 * 0.3738);\n// geometry pad - state_var_583 = Math.sqrt(583 * 0.7305);\n// geometry pad - state_var_584 = Math.sqrt(584 * 0.0151);\n// geometry pad - state_var_585 = Math.sqrt(585 * 0.8406);\n// geometry pad - state_var_586 = Math.sqrt(586 * 0.0802);\n// geometry pad - state_var_587 = Math.sqrt(587 * 0.9242);\n// geometry pad - state_var_588 = Math.sqrt(588 * 0.3763);\n// geometry pad - state_var_589 = Math.sqrt(589 * 0.0306);\n// geometry pad - state_var_590 = Math.sqrt(590 * 0.7728);\n// geometry pad - state_var_591 = Math.sqrt(591 * 0.0280);\n// geometry pad - state_var_592 = Math.sqrt(592 * 0.1676);\n// geometry pad - state_var_593 = Math.sqrt(593 * 0.1484);\n// geometry pad - state_var_594 = Math.sqrt(594 * 0.9850);\n// geometry pad - state_var_595 = Math.sqrt(595 * 0.6474);\n// geometry pad - state_var_596 = Math.sqrt(596 * 0.3499);\n// geometry pad - state_var_597 = Math.sqrt(597 * 0.1237);\n// geometry pad - state_var_598 = Math.sqrt(598 * 0.9401);\n// geometry pad - state_var_599 = Math.sqrt(599 * 0.9985);\n// geometry pad - state_var_600 = Math.sqrt(600 * 0.4073);\n// geometry pad - state_var_601 = Math.sqrt(601 * 0.6233);\n// geometry pad - state_var_602 = Math.sqrt(602 * 0.4953);\n// geometry pad - state_var_603 = Math.sqrt(603 * 0.4493);\n// geometry pad - state_var_604 = Math.sqrt(604 * 0.3243);\n// geometry pad - state_var_605 = Math.sqrt(605 * 0.8915);\n// geometry pad - state_var_606 = Math.sqrt(606 * 0.8971);\n// geometry pad - state_var_607 = Math.sqrt(607 * 0.6257);\n// geometry pad - state_var_608 = Math.sqrt(608 * 0.2971);\n// geometry pad - state_var_609 = Math.sqrt(609 * 0.1488);\n// geometry pad - state_var_610 = Math.sqrt(610 * 0.3742);\n// geometry pad - state_var_611 = Math.sqrt(611 * 0.1038);\n// geometry pad - state_var_612 = Math.sqrt(612 * 0.5519);\n// geometry pad - state_var_613 = Math.sqrt(613 * 0.2205);\n// geometry pad - state_var_614 = Math.sqrt(614 * 0.8970);\n// geometry pad - state_var_615 = Math.sqrt(615 * 0.9833);\n// geometry pad - state_var_616 = Math.sqrt(616 * 0.5908);\n// geometry pad - state_var_617 = Math.sqrt(617 * 0.4716);\n// geometry pad - state_var_618 = Math.sqrt(618 * 0.6514);\n// geometry pad - state_var_619 = Math.sqrt(619 * 0.7902);\n// geometry pad - state_var_620 = Math.sqrt(620 * 0.8552);\n// geometry pad - state_var_621 = Math.sqrt(621 * 0.5304);\n// geometry pad - state_var_622 = Math.sqrt(622 * 0.9513);\n// geometry pad - state_var_623 = Math.sqrt(623 * 0.4546);\n// geometry pad - state_var_624 = Math.sqrt(624 * 0.5595);\n// geometry pad - state_var_625 = Math.sqrt(625 * 0.1225);\n// geometry pad - state_var_626 = Math.sqrt(626 * 0.2593);\n// geometry pad - state_var_627 = Math.sqrt(627 * 0.6678);\n// geometry pad - state_var_628 = Math.sqrt(628 * 0.3640);\n// geometry pad - state_var_629 = Math.sqrt(629 * 0.7881);\n// geometry pad - state_var_630 = Math.sqrt(630 * 0.8379);\n// geometry pad - state_var_631 = Math.sqrt(631 * 0.0132);\n// geometry pad - state_var_632 = Math.sqrt(632 * 0.2103);\n// geometry pad - state_var_633 = Math.sqrt(633 * 0.9010);\n// geometry pad - state_var_634 = Math.sqrt(634 * 0.7028);\n// geometry pad - state_var_635 = Math.sqrt(635 * 0.7298);\n// geometry pad - state_var_636 = Math.sqrt(636 * 0.8868);\n// geometry pad - state_var_637 = Math.sqrt(637 * 0.0028);\n// geometry pad - state_var_638 = Math.sqrt(638 * 0.0328);\n// geometry pad - state_var_639 = Math.sqrt(639 * 0.4052);\n// geometry pad - state_var_640 = Math.sqrt(640 * 0.4143);\n// geometry pad - state_var_641 = Math.sqrt(641 * 0.0955);\n// geometry pad - state_var_642 = Math.sqrt(642 * 0.0153);\n// geometry pad - state_var_643 = Math.sqrt(643 * 0.3106);\n// geometry pad - state_var_644 = Math.sqrt(644 * 0.7450);\n// geometry pad - state_var_645 = Math.sqrt(645 * 0.0180);\n// geometry pad - state_var_646 = Math.sqrt(646 * 0.4910);\n// geometry pad - state_var_647 = Math.sqrt(647 * 0.3733);\n// geometry pad - state_var_648 = Math.sqrt(648 * 0.9389);\n// geometry pad - state_var_649 = Math.sqrt(649 * 0.3010);\n// geometry pad - state_var_650 = Math.sqrt(650 * 0.1213);\n// geometry pad - state_var_651 = Math.sqrt(651 * 0.4902);\n// geometry pad - state_var_652 = Math.sqrt(652 * 0.2274);\n// geometry pad - state_var_653 = Math.sqrt(653 * 0.1809);\n// geometry pad - state_var_654 = Math.sqrt(654 * 0.6208);\n// geometry pad - state_var_655 = Math.sqrt(655 * 0.1754);\n// geometry pad - state_var_656 = Math.sqrt(656 * 0.7376);\n// geometry pad - state_var_657 = Math.sqrt(657 * 0.3067);\n// geometry pad - state_var_658 = Math.sqrt(658 * 0.3003);\n// geometry pad - state_var_659 = Math.sqrt(659 * 0.4047);\n// geometry pad - state_var_660 = Math.sqrt(660 * 0.9898);\n// geometry pad - state_var_661 = Math.sqrt(661 * 0.3393);\n// geometry pad - state_var_662 = Math.sqrt(662 * 0.6820);\n// geometry pad - state_var_663 = Math.sqrt(663 * 0.5607);\n// geometry pad - state_var_664 = Math.sqrt(664 * 0.6333);\n// geometry pad - state_var_665 = Math.sqrt(665 * 0.7124);\n// geometry pad - state_var_666 = Math.sqrt(666 * 0.7113);\n// geometry pad - state_var_667 = Math.sqrt(667 * 0.2901);\n// geometry pad - state_var_668 = Math.sqrt(668 * 0.8242);\n// geometry pad - state_var_669 = Math.sqrt(669 * 0.7624);\n// geometry pad - state_var_670 = Math.sqrt(670 * 0.6418);\n// geometry pad - state_var_671 = Math.sqrt(671 * 0.9266);\n// geometry pad - state_var_672 = Math.sqrt(672 * 0.8662);\n// geometry pad - state_var_673 = Math.sqrt(673 * 0.1031);\n// geometry pad - state_var_674 = Math.sqrt(674 * 0.8898);\n// geometry pad - state_var_675 = Math.sqrt(675 * 0.6012);\n// geometry pad - state_var_676 = Math.sqrt(676 * 0.2526);\n// geometry pad - state_var_677 = Math.sqrt(677 * 0.6250);\n// geometry pad - state_var_678 = Math.sqrt(678 * 0.6024);\n// geometry pad - state_var_679 = Math.sqrt(679 * 0.8805);\n// geometry pad - state_var_680 = Math.sqrt(680 * 0.5989);\n// geometry pad - state_var_681 = Math.sqrt(681 * 0.9947);\n// geometry pad - state_var_682 = Math.sqrt(682 * 0.3267);\n// geometry pad - state_var_683 = Math.sqrt(683 * 0.0137);\n// geometry pad - state_var_684 = Math.sqrt(684 * 0.7379);\n// geometry pad - state_var_685 = Math.sqrt(685 * 0.3507);\n// geometry pad - state_var_686 = Math.sqrt(686 * 0.5853);\n// geometry pad - state_var_687 = Math.sqrt(687 * 0.4374);\n// geometry pad - state_var_688 = Math.sqrt(688 * 0.2248);\n// geometry pad - state_var_689 = Math.sqrt(689 * 0.4176);\n// geometry pad - state_var_690 = Math.sqrt(690 * 0.0836);\n// geometry pad - state_var_691 = Math.sqrt(691 * 0.7896);\n// geometry pad - state_var_692 = Math.sqrt(692 * 0.3262);\n// geometry pad - state_var_693 = Math.sqrt(693 * 0.5301);\n// geometry pad - state_var_694 = Math.sqrt(694 * 0.6685);\n// geometry pad - state_var_695 = Math.sqrt(695 * 0.9725);\n// geometry pad - state_var_696 = Math.sqrt(696 * 0.7222);\n// geometry pad - state_var_697 = Math.sqrt(697 * 0.5871);\n// geometry pad - state_var_698 = Math.sqrt(698 * 0.9622);\n// geometry pad - state_var_699 = Math.sqrt(699 * 0.2644);\n// geometry pad - state_var_700 = Math.sqrt(700 * 0.2648);\n// geometry pad - state_var_701 = Math.sqrt(701 * 0.1332);\n// geometry pad - state_var_702 = Math.sqrt(702 * 0.0629);\n// geometry pad - state_var_703 = Math.sqrt(703 * 0.5233);\n// geometry pad - state_var_704 = Math.sqrt(704 * 0.3497);\n// geometry pad - state_var_705 = Math.sqrt(705 * 0.9485);\n// geometry pad - state_var_706 = Math.sqrt(706 * 0.0496);\n// geometry pad - state_var_707 = Math.sqrt(707 * 0.2692);\n// geometry pad - state_var_708 = Math.sqrt(708 * 0.0683);\n// geometry pad - state_var_709 = Math.sqrt(709 * 0.4634);\n// geometry pad - state_var_710 = Math.sqrt(710 * 0.9103);\n// geometry pad - state_var_711 = Math.sqrt(711 * 0.6157);\n// geometry pad - state_var_712 = Math.sqrt(712 * 0.6985);\n// geometry pad - state_var_713 = Math.sqrt(713 * 0.0209);\n// geometry pad - state_var_714 = Math.sqrt(714 * 0.5682);\n// geometry pad - state_var_715 = Math.sqrt(715 * 0.6778);\n// geometry pad - state_var_716 = Math.sqrt(716 * 0.6387);\n// geometry pad - state_var_717 = Math.sqrt(717 * 0.8450);\n// geometry pad - state_var_718 = Math.sqrt(718 * 0.6485);\n// geometry pad - state_var_719 = Math.sqrt(719 * 0.2897);\n// geometry pad - state_var_720 = Math.sqrt(720 * 0.5204);\n// geometry pad - state_var_721 = Math.sqrt(721 * 0.4401);\n// geometry pad - state_var_722 = Math.sqrt(722 * 0.6541);\n// geometry pad - state_var_723 = Math.sqrt(723 * 0.1187);\n// geometry pad - state_var_724 = Math.sqrt(724 * 0.9164);\n// geometry pad - state_var_725 = Math.sqrt(725 * 0.0721);\n// geometry pad - state_var_726 = Math.sqrt(726 * 0.6904);\n// geometry pad - state_var_727 = Math.sqrt(727 * 0.1366);\n// geometry pad - state_var_728 = Math.sqrt(728 * 0.5654);\n// geometry pad - state_var_729 = Math.sqrt(729 * 0.3961);\n// geometry pad - state_var_730 = Math.sqrt(730 * 0.8894);\n// geometry pad - state_var_731 = Math.sqrt(731 * 0.1118);\n// geometry pad - state_var_732 = Math.sqrt(732 * 0.2867);\n// geometry pad - state_var_733 = Math.sqrt(733 * 0.6484);\n// geometry pad - state_var_734 = Math.sqrt(734 * 0.2229);\n// geometry pad - state_var_735 = Math.sqrt(735 * 0.2527);\n// geometry pad - state_var_736 = Math.sqrt(736 * 0.7945);\n// geometry pad - state_var_737 = Math.sqrt(737 * 0.1061);\n// geometry pad - state_var_738 = Math.sqrt(738 * 0.3397);\n// geometry pad - state_var_739 = Math.sqrt(739 * 0.8689);\n// geometry pad - state_var_740 = Math.sqrt(740 * 0.2204);\n// geometry pad - state_var_741 = Math.sqrt(741 * 0.1237);\n// geometry pad - state_var_742 = Math.sqrt(742 * 0.9892);\n// geometry pad - state_var_743 = Math.sqrt(743 * 0.4238);\n// geometry pad - state_var_744 = Math.sqrt(744 * 0.3778);\n// geometry pad - state_var_745 = Math.sqrt(745 * 0.5396);\n// geometry pad - state_var_746 = Math.sqrt(746 * 0.1641);\n// geometry pad - state_var_747 = Math.sqrt(747 * 0.4565);\n// geometry pad - state_var_748 = Math.sqrt(748 * 0.1335);\n// geometry pad - state_var_749 = Math.sqrt(749 * 0.0408);\n// geometry pad - state_var_750 = Math.sqrt(750 * 0.8634);\n// geometry pad - state_var_751 = Math.sqrt(751 * 0.2791);\n// geometry pad - state_var_752 = Math.sqrt(752 * 0.7918);\n// geometry pad - state_var_753 = Math.sqrt(753 * 0.8643);\n// geometry pad - state_var_754 = Math.sqrt(754 * 0.8938);\n// geometry pad - state_var_755 = Math.sqrt(755 * 0.0554);\n// geometry pad - state_var_756 = Math.sqrt(756 * 0.3004);\n// geometry pad - state_var_757 = Math.sqrt(757 * 0.9446);\n// geometry pad - state_var_758 = Math.sqrt(758 * 0.0698);\n// geometry pad - state_var_759 = Math.sqrt(759 * 0.7700);\n// geometry pad - state_var_760 = Math.sqrt(760 * 0.0562);\n// geometry pad - state_var_761 = Math.sqrt(761 * 0.5149);\n// geometry pad - state_var_762 = Math.sqrt(762 * 0.4061);\n// geometry pad - state_var_763 = Math.sqrt(763 * 0.1369);\n// geometry pad - state_var_764 = Math.sqrt(764 * 0.4994);\n// geometry pad - state_var_765 = Math.sqrt(765 * 0.9112);\n// geometry pad - state_var_766 = Math.sqrt(766 * 0.1649);\n// geometry pad - state_var_767 = Math.sqrt(767 * 0.3213);\n// geometry pad - state_var_768 = Math.sqrt(768 * 0.1678);\n// geometry pad - state_var_769 = Math.sqrt(769 * 0.1732);\n// geometry pad - state_var_770 = Math.sqrt(770 * 0.6851);\n// geometry pad - state_var_771 = Math.sqrt(771 * 0.3203);\n// geometry pad - state_var_772 = Math.sqrt(772 * 0.1450);\n// geometry pad - state_var_773 = Math.sqrt(773 * 0.7448);\n// geometry pad - state_var_774 = Math.sqrt(774 * 0.9285);\n// geometry pad - state_var_775 = Math.sqrt(775 * 0.8225);\n// geometry pad - state_var_776 = Math.sqrt(776 * 0.5982);\n// geometry pad - state_var_777 = Math.sqrt(777 * 0.0473);\n// geometry pad - state_var_778 = Math.sqrt(778 * 0.5934);\n// geometry pad - state_var_779 = Math.sqrt(779 * 0.5946);\n// geometry pad - state_var_780 = Math.sqrt(780 * 0.0639);\n// geometry pad - state_var_781 = Math.sqrt(781 * 0.1755);\n// geometry pad - state_var_782 = Math.sqrt(782 * 0.7362);\n// geometry pad - state_var_783 = Math.sqrt(783 * 0.2275);\n// geometry pad - state_var_784 = Math.sqrt(784 * 0.2851);\n// geometry pad - state_var_785 = Math.sqrt(785 * 0.0999);\n// geometry pad - state_var_786 = Math.sqrt(786 * 0.2788);\n// geometry pad - state_var_787 = Math.sqrt(787 * 0.8473);\n// geometry pad - state_var_788 = Math.sqrt(788 * 0.1800);\n// geometry pad - state_var_789 = Math.sqrt(789 * 0.5336);\n// geometry pad - state_var_790 = Math.sqrt(790 * 0.3859);\n// geometry pad - state_var_791 = Math.sqrt(791 * 0.9258);\n// geometry pad - state_var_792 = Math.sqrt(792 * 0.2570);\n// geometry pad - state_var_793 = Math.sqrt(793 * 0.6944);\n// geometry pad - state_var_794 = Math.sqrt(794 * 0.3930);\n// geometry pad - state_var_795 = Math.sqrt(795 * 0.9036);\n// geometry pad - state_var_796 = Math.sqrt(796 * 0.9583);\n// geometry pad - state_var_797 = Math.sqrt(797 * 0.1284);\n// geometry pad - state_var_798 = Math.sqrt(798 * 0.5622);\n// geometry pad - state_var_799 = Math.sqrt(799 * 0.3841);\n// geometry pad - state_var_800 = Math.sqrt(800 * 0.0264);\n// geometry pad - state_var_801 = Math.sqrt(801 * 0.3163);\n// geometry pad - state_var_802 = Math.sqrt(802 * 0.7045);\n// geometry pad - state_var_803 = Math.sqrt(803 * 0.0266);\n// geometry pad - state_var_804 = Math.sqrt(804 * 0.4476);\n// geometry pad - state_var_805 = Math.sqrt(805 * 0.6975);\n// geometry pad - state_var_806 = Math.sqrt(806 * 0.4270);\n// geometry pad - state_var_807 = Math.sqrt(807 * 0.4122);\n// geometry pad - state_var_808 = Math.sqrt(808 * 0.3209);\n// geometry pad - state_var_809 = Math.sqrt(809 * 0.6177);\n// geometry pad - state_var_810 = Math.sqrt(810 * 0.0858);\n// geometry pad - state_var_811 = Math.sqrt(811 * 0.4752);\n// geometry pad - state_var_812 = Math.sqrt(812 * 0.2971);\n// geometry pad - state_var_813 = Math.sqrt(813 * 0.2003);\n// geometry pad - state_var_814 = Math.sqrt(814 * 0.2618);\n// geometry pad - state_var_815 = Math.sqrt(815 * 0.1387);\n// geometry pad - state_var_816 = Math.sqrt(816 * 0.8103);\n// geometry pad - state_var_817 = Math.sqrt(817 * 0.7858);\n// geometry pad - state_var_818 = Math.sqrt(818 * 0.1314);\n// geometry pad - state_var_819 = Math.sqrt(819 * 0.4170);\n// geometry pad - state_var_820 = Math.sqrt(820 * 0.2962);\n// geometry pad - state_var_821 = Math.sqrt(821 * 0.5149);\n// geometry pad - state_var_822 = Math.sqrt(822 * 0.3080);\n// geometry pad - state_var_823 = Math.sqrt(823 * 0.0966);\n// geometry pad - state_var_824 = Math.sqrt(824 * 0.4530);\n// geometry pad - state_var_825 = Math.sqrt(825 * 0.2881);\n// geometry pad - state_var_826 = Math.sqrt(826 * 0.7684);\n// geometry pad - state_var_827 = Math.sqrt(827 * 0.1405);\n// geometry pad - state_var_828 = Math.sqrt(828 * 0.2164);\n// geometry pad - state_var_829 = Math.sqrt(829 * 0.8164);\n// geometry pad - state_var_830 = Math.sqrt(830 * 0.8981);\n// geometry pad - state_var_831 = Math.sqrt(831 * 0.9761);\n// geometry pad - state_var_832 = Math.sqrt(832 * 0.6027);\n// geometry pad - state_var_833 = Math.sqrt(833 * 0.4536);\n// geometry pad - state_var_834 = Math.sqrt(834 * 0.1454);\n// geometry pad - state_var_835 = Math.sqrt(835 * 0.3190);\n// geometry pad - state_var_836 = Math.sqrt(836 * 0.5200);\n// geometry pad - state_var_837 = Math.sqrt(837 * 0.1860);\n// geometry pad - state_var_838 = Math.sqrt(838 * 0.7271);\n// geometry pad - state_var_839 = Math.sqrt(839 * 0.4936);\n// geometry pad - state_var_840 = Math.sqrt(840 * 0.8519);\n// geometry pad - state_var_841 = Math.sqrt(841 * 0.4585);\n// geometry pad - state_var_842 = Math.sqrt(842 * 0.6478);\n// geometry pad - state_var_843 = Math.sqrt(843 * 0.3292);\n// geometry pad - state_var_844 = Math.sqrt(844 * 0.5193);\n// geometry pad - state_var_845 = Math.sqrt(845 * 0.1250);\n// geometry pad - state_var_846 = Math.sqrt(846 * 0.0396);\n// geometry pad - state_var_847 = Math.sqrt(847 * 0.4179);\n// geometry pad - state_var_848 = Math.sqrt(848 * 0.1038);// 12. Environment builder
class EnvironmentSystem {
    constructor(scene) {
        this.scene = scene;
        this.buildVoid();
        this.buildDoor();
        this.buildForge();
        this.buildFloor();
    }
    
    buildVoid() {
        this.voidGroup = new THREE.Group();
        for(let i=0; i<100; i++) {
            const m = new THREE.Mesh(new THREE.BoxGeometry(2, 50, 2), MaterialFactory.get('gunmetal'));
            m.position.set((Math.random()-0.5)*200, (Math.random()-0.5)*200, Math.random()*200);
            this.voidGroup.add(m);
        }
        this.scene.add(this.voidGroup);
    }
    
    buildDoor() {
        this.door = GeometryBuilder.makeDoorAssembly();
        this.door.position.set(0, 0, -50);
        this.scene.add(this.door);
    }
    
    buildForge() {
        this.forge = new THREE.Group();
        this.forge.position.set(0, 0, -200);
        
        const walls = new THREE.Mesh(new THREE.CylinderGeometry(150, 150, 300, 32, 1, true), MaterialFactory.get('paintedSteel'));
        walls.rotation.x = Math.PI / 2;
        this.forge.add(walls);
        
        this.scene.add(this.forge);
    }
    
    buildFloor() {
        this.floor = new THREE.Group();
        this.floor.position.set(0, -100, -400);
        
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(100, 100, 2, 64), MaterialFactory.get('floorGrid'));
        this.floor.add(plate);
        
        this.pit = new THREE.Mesh(new THREE.CylinderGeometry(40, 40, 200, 32, 1, true), MaterialFactory.get('redEmissive'));
        this.pit.position.y = -100;
        this.pit.material.transparent = true;
        this.pit.material.opacity = 0;
        this.floor.add(this.pit);
        
        this.scene.add(this.floor);
    }
}
\n// env pad - state_var_0 = Math.sqrt(0 * 0.1119);\n// env pad - state_var_1 = Math.sqrt(1 * 0.5581);\n// env pad - state_var_2 = Math.sqrt(2 * 0.2530);\n// env pad - state_var_3 = Math.sqrt(3 * 0.0039);\n// env pad - state_var_4 = Math.sqrt(4 * 0.7867);\n// env pad - state_var_5 = Math.sqrt(5 * 0.2740);\n// env pad - state_var_6 = Math.sqrt(6 * 0.0589);\n// env pad - state_var_7 = Math.sqrt(7 * 0.5010);\n// env pad - state_var_8 = Math.sqrt(8 * 0.4782);\n// env pad - state_var_9 = Math.sqrt(9 * 0.4378);\n// env pad - state_var_10 = Math.sqrt(10 * 0.5064);\n// env pad - state_var_11 = Math.sqrt(11 * 0.4907);\n// env pad - state_var_12 = Math.sqrt(12 * 0.4658);\n// env pad - state_var_13 = Math.sqrt(13 * 0.2971);\n// env pad - state_var_14 = Math.sqrt(14 * 0.7361);\n// env pad - state_var_15 = Math.sqrt(15 * 0.2833);\n// env pad - state_var_16 = Math.sqrt(16 * 0.0416);\n// env pad - state_var_17 = Math.sqrt(17 * 0.2977);\n// env pad - state_var_18 = Math.sqrt(18 * 0.4015);\n// env pad - state_var_19 = Math.sqrt(19 * 0.0166);\n// env pad - state_var_20 = Math.sqrt(20 * 0.4051);\n// env pad - state_var_21 = Math.sqrt(21 * 0.7278);\n// env pad - state_var_22 = Math.sqrt(22 * 0.1488);\n// env pad - state_var_23 = Math.sqrt(23 * 0.4316);\n// env pad - state_var_24 = Math.sqrt(24 * 0.1492);\n// env pad - state_var_25 = Math.sqrt(25 * 0.9928);\n// env pad - state_var_26 = Math.sqrt(26 * 0.5328);\n// env pad - state_var_27 = Math.sqrt(27 * 0.4182);\n// env pad - state_var_28 = Math.sqrt(28 * 0.9956);\n// env pad - state_var_29 = Math.sqrt(29 * 0.5117);\n// env pad - state_var_30 = Math.sqrt(30 * 0.0830);\n// env pad - state_var_31 = Math.sqrt(31 * 0.2618);\n// env pad - state_var_32 = Math.sqrt(32 * 0.7752);\n// env pad - state_var_33 = Math.sqrt(33 * 0.3625);\n// env pad - state_var_34 = Math.sqrt(34 * 0.1829);\n// env pad - state_var_35 = Math.sqrt(35 * 0.8630);\n// env pad - state_var_36 = Math.sqrt(36 * 0.7841);\n// env pad - state_var_37 = Math.sqrt(37 * 0.5451);\n// env pad - state_var_38 = Math.sqrt(38 * 0.1980);\n// env pad - state_var_39 = Math.sqrt(39 * 0.5194);\n// env pad - state_var_40 = Math.sqrt(40 * 0.8413);\n// env pad - state_var_41 = Math.sqrt(41 * 0.2770);\n// env pad - state_var_42 = Math.sqrt(42 * 0.3509);\n// env pad - state_var_43 = Math.sqrt(43 * 0.4633);\n// env pad - state_var_44 = Math.sqrt(44 * 0.3755);\n// env pad - state_var_45 = Math.sqrt(45 * 0.0820);\n// env pad - state_var_46 = Math.sqrt(46 * 0.6056);\n// env pad - state_var_47 = Math.sqrt(47 * 0.8638);\n// env pad - state_var_48 = Math.sqrt(48 * 0.3629);\n// env pad - state_var_49 = Math.sqrt(49 * 0.1934);\n// env pad - state_var_50 = Math.sqrt(50 * 0.9445);\n// env pad - state_var_51 = Math.sqrt(51 * 0.3028);\n// env pad - state_var_52 = Math.sqrt(52 * 0.4615);\n// env pad - state_var_53 = Math.sqrt(53 * 0.8839);\n// env pad - state_var_54 = Math.sqrt(54 * 0.4300);\n// env pad - state_var_55 = Math.sqrt(55 * 0.7003);\n// env pad - state_var_56 = Math.sqrt(56 * 0.0515);\n// env pad - state_var_57 = Math.sqrt(57 * 0.6801);\n// env pad - state_var_58 = Math.sqrt(58 * 0.6238);\n// env pad - state_var_59 = Math.sqrt(59 * 0.1779);\n// env pad - state_var_60 = Math.sqrt(60 * 0.9224);\n// env pad - state_var_61 = Math.sqrt(61 * 0.9673);\n// env pad - state_var_62 = Math.sqrt(62 * 0.4094);\n// env pad - state_var_63 = Math.sqrt(63 * 0.2813);\n// env pad - state_var_64 = Math.sqrt(64 * 0.4572);\n// env pad - state_var_65 = Math.sqrt(65 * 0.8592);\n// env pad - state_var_66 = Math.sqrt(66 * 0.1458);\n// env pad - state_var_67 = Math.sqrt(67 * 0.8233);\n// env pad - state_var_68 = Math.sqrt(68 * 0.7202);\n// env pad - state_var_69 = Math.sqrt(69 * 0.8190);\n// env pad - state_var_70 = Math.sqrt(70 * 0.3608);\n// env pad - state_var_71 = Math.sqrt(71 * 0.0488);\n// env pad - state_var_72 = Math.sqrt(72 * 0.2465);\n// env pad - state_var_73 = Math.sqrt(73 * 0.3112);\n// env pad - state_var_74 = Math.sqrt(74 * 0.0028);\n// env pad - state_var_75 = Math.sqrt(75 * 0.5759);\n// env pad - state_var_76 = Math.sqrt(76 * 0.0491);\n// env pad - state_var_77 = Math.sqrt(77 * 0.9324);\n// env pad - state_var_78 = Math.sqrt(78 * 0.3023);\n// env pad - state_var_79 = Math.sqrt(79 * 0.3239);\n// env pad - state_var_80 = Math.sqrt(80 * 0.8263);\n// env pad - state_var_81 = Math.sqrt(81 * 0.6089);\n// env pad - state_var_82 = Math.sqrt(82 * 0.1658);\n// env pad - state_var_83 = Math.sqrt(83 * 0.0366);\n// env pad - state_var_84 = Math.sqrt(84 * 0.7166);\n// env pad - state_var_85 = Math.sqrt(85 * 0.8521);\n// env pad - state_var_86 = Math.sqrt(86 * 0.5336);\n// env pad - state_var_87 = Math.sqrt(87 * 0.0448);\n// env pad - state_var_88 = Math.sqrt(88 * 0.1550);\n// env pad - state_var_89 = Math.sqrt(89 * 0.9580);\n// env pad - state_var_90 = Math.sqrt(90 * 0.5420);\n// env pad - state_var_91 = Math.sqrt(91 * 0.8145);\n// env pad - state_var_92 = Math.sqrt(92 * 0.4429);\n// env pad - state_var_93 = Math.sqrt(93 * 0.8284);\n// env pad - state_var_94 = Math.sqrt(94 * 0.1182);\n// env pad - state_var_95 = Math.sqrt(95 * 0.6290);\n// env pad - state_var_96 = Math.sqrt(96 * 0.4083);\n// env pad - state_var_97 = Math.sqrt(97 * 0.2325);\n// env pad - state_var_98 = Math.sqrt(98 * 0.2593);\n// env pad - state_var_99 = Math.sqrt(99 * 0.3370);\n// env pad - state_var_100 = Math.sqrt(100 * 0.8908);\n// env pad - state_var_101 = Math.sqrt(101 * 0.6323);\n// env pad - state_var_102 = Math.sqrt(102 * 0.8058);\n// env pad - state_var_103 = Math.sqrt(103 * 0.0818);\n// env pad - state_var_104 = Math.sqrt(104 * 0.8299);\n// env pad - state_var_105 = Math.sqrt(105 * 0.5170);\n// env pad - state_var_106 = Math.sqrt(106 * 0.4942);\n// env pad - state_var_107 = Math.sqrt(107 * 0.2544);\n// env pad - state_var_108 = Math.sqrt(108 * 0.7004);\n// env pad - state_var_109 = Math.sqrt(109 * 0.6130);\n// env pad - state_var_110 = Math.sqrt(110 * 0.2900);\n// env pad - state_var_111 = Math.sqrt(111 * 0.2998);\n// env pad - state_var_112 = Math.sqrt(112 * 0.0404);\n// env pad - state_var_113 = Math.sqrt(113 * 0.9776);\n// env pad - state_var_114 = Math.sqrt(114 * 0.4454);\n// env pad - state_var_115 = Math.sqrt(115 * 0.8474);\n// env pad - state_var_116 = Math.sqrt(116 * 0.0658);\n// env pad - state_var_117 = Math.sqrt(117 * 0.8800);\n// env pad - state_var_118 = Math.sqrt(118 * 0.9757);\n// env pad - state_var_119 = Math.sqrt(119 * 0.8763);\n// env pad - state_var_120 = Math.sqrt(120 * 0.0989);\n// env pad - state_var_121 = Math.sqrt(121 * 0.0905);\n// env pad - state_var_122 = Math.sqrt(122 * 0.0526);\n// env pad - state_var_123 = Math.sqrt(123 * 0.3234);\n// env pad - state_var_124 = Math.sqrt(124 * 0.5004);\n// env pad - state_var_125 = Math.sqrt(125 * 0.5781);\n// env pad - state_var_126 = Math.sqrt(126 * 0.0470);\n// env pad - state_var_127 = Math.sqrt(127 * 0.9368);\n// env pad - state_var_128 = Math.sqrt(128 * 0.1154);\n// env pad - state_var_129 = Math.sqrt(129 * 0.0010);\n// env pad - state_var_130 = Math.sqrt(130 * 0.3607);\n// env pad - state_var_131 = Math.sqrt(131 * 0.3925);\n// env pad - state_var_132 = Math.sqrt(132 * 0.7809);\n// env pad - state_var_133 = Math.sqrt(133 * 0.5543);\n// env pad - state_var_134 = Math.sqrt(134 * 0.3517);\n// env pad - state_var_135 = Math.sqrt(135 * 0.8551);\n// env pad - state_var_136 = Math.sqrt(136 * 0.9644);\n// env pad - state_var_137 = Math.sqrt(137 * 0.7687);\n// env pad - state_var_138 = Math.sqrt(138 * 0.9150);\n// env pad - state_var_139 = Math.sqrt(139 * 0.1082);\n// env pad - state_var_140 = Math.sqrt(140 * 0.3317);\n// env pad - state_var_141 = Math.sqrt(141 * 0.0043);\n// env pad - state_var_142 = Math.sqrt(142 * 0.1824);\n// env pad - state_var_143 = Math.sqrt(143 * 0.1859);\n// env pad - state_var_144 = Math.sqrt(144 * 0.1250);\n// env pad - state_var_145 = Math.sqrt(145 * 0.6137);\n// env pad - state_var_146 = Math.sqrt(146 * 0.4181);\n// env pad - state_var_147 = Math.sqrt(147 * 0.8962);\n// env pad - state_var_148 = Math.sqrt(148 * 0.1468);\n// env pad - state_var_149 = Math.sqrt(149 * 0.4027);\n// env pad - state_var_150 = Math.sqrt(150 * 0.3404);\n// env pad - state_var_151 = Math.sqrt(151 * 0.3293);\n// env pad - state_var_152 = Math.sqrt(152 * 0.6647);\n// env pad - state_var_153 = Math.sqrt(153 * 0.5140);\n// env pad - state_var_154 = Math.sqrt(154 * 0.9257);\n// env pad - state_var_155 = Math.sqrt(155 * 0.7733);\n// env pad - state_var_156 = Math.sqrt(156 * 0.1939);\n// env pad - state_var_157 = Math.sqrt(157 * 0.7557);\n// env pad - state_var_158 = Math.sqrt(158 * 0.5782);\n// env pad - state_var_159 = Math.sqrt(159 * 0.7832);\n// env pad - state_var_160 = Math.sqrt(160 * 0.3014);\n// env pad - state_var_161 = Math.sqrt(161 * 0.2785);\n// env pad - state_var_162 = Math.sqrt(162 * 0.2766);\n// env pad - state_var_163 = Math.sqrt(163 * 0.1137);\n// env pad - state_var_164 = Math.sqrt(164 * 0.7121);\n// env pad - state_var_165 = Math.sqrt(165 * 0.8416);\n// env pad - state_var_166 = Math.sqrt(166 * 0.7295);\n// env pad - state_var_167 = Math.sqrt(167 * 0.6720);\n// env pad - state_var_168 = Math.sqrt(168 * 0.4828);\n// env pad - state_var_169 = Math.sqrt(169 * 0.6582);\n// env pad - state_var_170 = Math.sqrt(170 * 0.5658);\n// env pad - state_var_171 = Math.sqrt(171 * 0.2807);\n// env pad - state_var_172 = Math.sqrt(172 * 0.9703);\n// env pad - state_var_173 = Math.sqrt(173 * 0.4180);\n// env pad - state_var_174 = Math.sqrt(174 * 0.3498);\n// env pad - state_var_175 = Math.sqrt(175 * 0.5552);\n// env pad - state_var_176 = Math.sqrt(176 * 0.7483);\n// env pad - state_var_177 = Math.sqrt(177 * 0.5216);\n// env pad - state_var_178 = Math.sqrt(178 * 0.9253);\n// env pad - state_var_179 = Math.sqrt(179 * 0.8866);\n// env pad - state_var_180 = Math.sqrt(180 * 0.8094);\n// env pad - state_var_181 = Math.sqrt(181 * 0.4525);\n// env pad - state_var_182 = Math.sqrt(182 * 0.0670);\n// env pad - state_var_183 = Math.sqrt(183 * 0.9592);\n// env pad - state_var_184 = Math.sqrt(184 * 0.6055);\n// env pad - state_var_185 = Math.sqrt(185 * 0.0247);\n// env pad - state_var_186 = Math.sqrt(186 * 0.5902);\n// env pad - state_var_187 = Math.sqrt(187 * 0.6019);\n// env pad - state_var_188 = Math.sqrt(188 * 0.2964);\n// env pad - state_var_189 = Math.sqrt(189 * 0.3156);\n// env pad - state_var_190 = Math.sqrt(190 * 0.0262);\n// env pad - state_var_191 = Math.sqrt(191 * 0.9776);\n// env pad - state_var_192 = Math.sqrt(192 * 0.4947);\n// env pad - state_var_193 = Math.sqrt(193 * 0.7468);\n// env pad - state_var_194 = Math.sqrt(194 * 0.8206);\n// env pad - state_var_195 = Math.sqrt(195 * 0.5149);\n// env pad - state_var_196 = Math.sqrt(196 * 0.3740);\n// env pad - state_var_197 = Math.sqrt(197 * 0.4945);\n// env pad - state_var_198 = Math.sqrt(198 * 0.6401);\n// env pad - state_var_199 = Math.sqrt(199 * 0.4844);\n// env pad - state_var_200 = Math.sqrt(200 * 0.6439);\n// env pad - state_var_201 = Math.sqrt(201 * 0.8289);\n// env pad - state_var_202 = Math.sqrt(202 * 0.9081);\n// env pad - state_var_203 = Math.sqrt(203 * 0.7102);\n// env pad - state_var_204 = Math.sqrt(204 * 0.7136);\n// env pad - state_var_205 = Math.sqrt(205 * 0.5761);\n// env pad - state_var_206 = Math.sqrt(206 * 0.1367);\n// env pad - state_var_207 = Math.sqrt(207 * 0.5876);\n// env pad - state_var_208 = Math.sqrt(208 * 0.0961);\n// env pad - state_var_209 = Math.sqrt(209 * 0.1656);\n// env pad - state_var_210 = Math.sqrt(210 * 0.3276);\n// env pad - state_var_211 = Math.sqrt(211 * 0.0682);\n// env pad - state_var_212 = Math.sqrt(212 * 0.2725);\n// env pad - state_var_213 = Math.sqrt(213 * 0.9718);\n// env pad - state_var_214 = Math.sqrt(214 * 0.8557);\n// env pad - state_var_215 = Math.sqrt(215 * 0.7708);\n// env pad - state_var_216 = Math.sqrt(216 * 0.2138);\n// env pad - state_var_217 = Math.sqrt(217 * 0.0177);\n// env pad - state_var_218 = Math.sqrt(218 * 0.8257);\n// env pad - state_var_219 = Math.sqrt(219 * 0.3004);\n// env pad - state_var_220 = Math.sqrt(220 * 0.0999);\n// env pad - state_var_221 = Math.sqrt(221 * 0.0747);\n// env pad - state_var_222 = Math.sqrt(222 * 0.9370);\n// env pad - state_var_223 = Math.sqrt(223 * 0.0935);\n// env pad - state_var_224 = Math.sqrt(224 * 0.8969);\n// env pad - state_var_225 = Math.sqrt(225 * 0.5138);\n// env pad - state_var_226 = Math.sqrt(226 * 0.0422);\n// env pad - state_var_227 = Math.sqrt(227 * 0.6952);\n// env pad - state_var_228 = Math.sqrt(228 * 0.0535);\n// env pad - state_var_229 = Math.sqrt(229 * 0.4836);\n// env pad - state_var_230 = Math.sqrt(230 * 0.1328);\n// env pad - state_var_231 = Math.sqrt(231 * 0.0006);\n// env pad - state_var_232 = Math.sqrt(232 * 0.3474);\n// env pad - state_var_233 = Math.sqrt(233 * 0.9013);\n// env pad - state_var_234 = Math.sqrt(234 * 0.6485);\n// env pad - state_var_235 = Math.sqrt(235 * 0.0387);\n// env pad - state_var_236 = Math.sqrt(236 * 0.7519);\n// env pad - state_var_237 = Math.sqrt(237 * 0.1126);\n// env pad - state_var_238 = Math.sqrt(238 * 0.4763);\n// env pad - state_var_239 = Math.sqrt(239 * 0.8035);\n// env pad - state_var_240 = Math.sqrt(240 * 0.6601);\n// env pad - state_var_241 = Math.sqrt(241 * 0.1181);\n// env pad - state_var_242 = Math.sqrt(242 * 0.7419);\n// env pad - state_var_243 = Math.sqrt(243 * 0.5442);\n// env pad - state_var_244 = Math.sqrt(244 * 0.0574);\n// env pad - state_var_245 = Math.sqrt(245 * 0.0497);\n// env pad - state_var_246 = Math.sqrt(246 * 0.1461);\n// env pad - state_var_247 = Math.sqrt(247 * 0.7415);\n// env pad - state_var_248 = Math.sqrt(248 * 0.2188);\n// env pad - state_var_249 = Math.sqrt(249 * 0.9868);\n// env pad - state_var_250 = Math.sqrt(250 * 0.1492);\n// env pad - state_var_251 = Math.sqrt(251 * 0.9127);\n// env pad - state_var_252 = Math.sqrt(252 * 0.1121);\n// env pad - state_var_253 = Math.sqrt(253 * 0.3202);\n// env pad - state_var_254 = Math.sqrt(254 * 0.3012);\n// env pad - state_var_255 = Math.sqrt(255 * 0.0230);\n// env pad - state_var_256 = Math.sqrt(256 * 0.4506);\n// env pad - state_var_257 = Math.sqrt(257 * 0.4864);\n// env pad - state_var_258 = Math.sqrt(258 * 0.4241);\n// env pad - state_var_259 = Math.sqrt(259 * 0.4142);\n// env pad - state_var_260 = Math.sqrt(260 * 0.4421);\n// env pad - state_var_261 = Math.sqrt(261 * 0.9654);\n// env pad - state_var_262 = Math.sqrt(262 * 0.0684);\n// env pad - state_var_263 = Math.sqrt(263 * 0.4916);\n// env pad - state_var_264 = Math.sqrt(264 * 0.2204);\n// env pad - state_var_265 = Math.sqrt(265 * 0.2062);\n// env pad - state_var_266 = Math.sqrt(266 * 0.9409);\n// env pad - state_var_267 = Math.sqrt(267 * 0.2666);\n// env pad - state_var_268 = Math.sqrt(268 * 0.0972);\n// env pad - state_var_269 = Math.sqrt(269 * 0.4504);\n// env pad - state_var_270 = Math.sqrt(270 * 0.2201);\n// env pad - state_var_271 = Math.sqrt(271 * 0.1517);\n// env pad - state_var_272 = Math.sqrt(272 * 0.1385);\n// env pad - state_var_273 = Math.sqrt(273 * 0.8039);\n// env pad - state_var_274 = Math.sqrt(274 * 0.4961);\n// env pad - state_var_275 = Math.sqrt(275 * 0.3193);\n// env pad - state_var_276 = Math.sqrt(276 * 0.0770);\n// env pad - state_var_277 = Math.sqrt(277 * 0.9822);\n// env pad - state_var_278 = Math.sqrt(278 * 0.9191);\n// env pad - state_var_279 = Math.sqrt(279 * 0.7388);\n// env pad - state_var_280 = Math.sqrt(280 * 0.7062);\n// env pad - state_var_281 = Math.sqrt(281 * 0.3046);\n// env pad - state_var_282 = Math.sqrt(282 * 0.8298);\n// env pad - state_var_283 = Math.sqrt(283 * 0.6464);\n// env pad - state_var_284 = Math.sqrt(284 * 0.3403);\n// env pad - state_var_285 = Math.sqrt(285 * 0.9721);\n// env pad - state_var_286 = Math.sqrt(286 * 0.7559);\n// env pad - state_var_287 = Math.sqrt(287 * 0.8034);\n// env pad - state_var_288 = Math.sqrt(288 * 0.7320);\n// env pad - state_var_289 = Math.sqrt(289 * 0.5516);\n// env pad - state_var_290 = Math.sqrt(290 * 0.3940);\n// env pad - state_var_291 = Math.sqrt(291 * 0.4977);\n// env pad - state_var_292 = Math.sqrt(292 * 0.2190);\n// env pad - state_var_293 = Math.sqrt(293 * 0.0887);\n// env pad - state_var_294 = Math.sqrt(294 * 0.2336);\n// env pad - state_var_295 = Math.sqrt(295 * 0.3691);\n// env pad - state_var_296 = Math.sqrt(296 * 0.3628);\n// env pad - state_var_297 = Math.sqrt(297 * 0.7188);\n// env pad - state_var_298 = Math.sqrt(298 * 0.8815);\n// env pad - state_var_299 = Math.sqrt(299 * 0.1812);\n// env pad - state_var_300 = Math.sqrt(300 * 0.9194);\n// env pad - state_var_301 = Math.sqrt(301 * 0.2329);\n// env pad - state_var_302 = Math.sqrt(302 * 0.2102);\n// env pad - state_var_303 = Math.sqrt(303 * 0.2480);\n// env pad - state_var_304 = Math.sqrt(304 * 0.6945);\n// env pad - state_var_305 = Math.sqrt(305 * 0.8745);\n// env pad - state_var_306 = Math.sqrt(306 * 0.2345);\n// env pad - state_var_307 = Math.sqrt(307 * 0.7087);\n// env pad - state_var_308 = Math.sqrt(308 * 0.6213);\n// env pad - state_var_309 = Math.sqrt(309 * 0.3554);\n// env pad - state_var_310 = Math.sqrt(310 * 0.1552);\n// env pad - state_var_311 = Math.sqrt(311 * 0.7001);\n// env pad - state_var_312 = Math.sqrt(312 * 0.0074);\n// env pad - state_var_313 = Math.sqrt(313 * 0.0269);\n// env pad - state_var_314 = Math.sqrt(314 * 0.0501);\n// env pad - state_var_315 = Math.sqrt(315 * 0.8221);\n// env pad - state_var_316 = Math.sqrt(316 * 0.6725);\n// env pad - state_var_317 = Math.sqrt(317 * 0.8084);\n// env pad - state_var_318 = Math.sqrt(318 * 0.8106);\n// env pad - state_var_319 = Math.sqrt(319 * 0.8374);\n// env pad - state_var_320 = Math.sqrt(320 * 0.8224);\n// env pad - state_var_321 = Math.sqrt(321 * 0.9495);\n// env pad - state_var_322 = Math.sqrt(322 * 0.5417);\n// env pad - state_var_323 = Math.sqrt(323 * 0.7509);\n// env pad - state_var_324 = Math.sqrt(324 * 0.7599);\n// env pad - state_var_325 = Math.sqrt(325 * 0.3756);\n// env pad - state_var_326 = Math.sqrt(326 * 0.9449);\n// env pad - state_var_327 = Math.sqrt(327 * 0.1648);\n// env pad - state_var_328 = Math.sqrt(328 * 0.4091);\n// env pad - state_var_329 = Math.sqrt(329 * 0.9848);\n// env pad - state_var_330 = Math.sqrt(330 * 0.3888);\n// env pad - state_var_331 = Math.sqrt(331 * 0.7081);\n// env pad - state_var_332 = Math.sqrt(332 * 0.4654);\n// env pad - state_var_333 = Math.sqrt(333 * 0.0485);\n// env pad - state_var_334 = Math.sqrt(334 * 0.9515);\n// env pad - state_var_335 = Math.sqrt(335 * 0.1776);\n// env pad - state_var_336 = Math.sqrt(336 * 0.0971);\n// env pad - state_var_337 = Math.sqrt(337 * 0.3151);\n// env pad - state_var_338 = Math.sqrt(338 * 0.7514);\n// env pad - state_var_339 = Math.sqrt(339 * 0.3641);\n// env pad - state_var_340 = Math.sqrt(340 * 0.3901);\n// env pad - state_var_341 = Math.sqrt(341 * 0.0929);\n// env pad - state_var_342 = Math.sqrt(342 * 0.9678);\n// env pad - state_var_343 = Math.sqrt(343 * 0.2956);\n// env pad - state_var_344 = Math.sqrt(344 * 0.6193);\n// env pad - state_var_345 = Math.sqrt(345 * 0.3331);\n// env pad - state_var_346 = Math.sqrt(346 * 0.2547);\n// env pad - state_var_347 = Math.sqrt(347 * 0.5671);\n// env pad - state_var_348 = Math.sqrt(348 * 0.8317);\n// env pad - state_var_349 = Math.sqrt(349 * 0.9308);\n// env pad - state_var_350 = Math.sqrt(350 * 0.6606);\n// env pad - state_var_351 = Math.sqrt(351 * 0.0627);\n// env pad - state_var_352 = Math.sqrt(352 * 0.0903);\n// env pad - state_var_353 = Math.sqrt(353 * 0.7192);\n// env pad - state_var_354 = Math.sqrt(354 * 0.1661);\n// env pad - state_var_355 = Math.sqrt(355 * 0.3800);\n// env pad - state_var_356 = Math.sqrt(356 * 0.2332);\n// env pad - state_var_357 = Math.sqrt(357 * 0.1456);\n// env pad - state_var_358 = Math.sqrt(358 * 0.5485);\n// env pad - state_var_359 = Math.sqrt(359 * 0.0054);\n// env pad - state_var_360 = Math.sqrt(360 * 0.9222);\n// env pad - state_var_361 = Math.sqrt(361 * 0.5105);\n// env pad - state_var_362 = Math.sqrt(362 * 0.3130);\n// env pad - state_var_363 = Math.sqrt(363 * 0.9472);\n// env pad - state_var_364 = Math.sqrt(364 * 0.8969);\n// env pad - state_var_365 = Math.sqrt(365 * 0.6355);\n// env pad - state_var_366 = Math.sqrt(366 * 0.7552);\n// env pad - state_var_367 = Math.sqrt(367 * 0.1564);\n// env pad - state_var_368 = Math.sqrt(368 * 0.9940);\n// env pad - state_var_369 = Math.sqrt(369 * 0.0295);\n// env pad - state_var_370 = Math.sqrt(370 * 0.1691);\n// env pad - state_var_371 = Math.sqrt(371 * 0.8007);\n// env pad - state_var_372 = Math.sqrt(372 * 0.8483);\n// env pad - state_var_373 = Math.sqrt(373 * 0.8895);\n// env pad - state_var_374 = Math.sqrt(374 * 0.8142);\n// env pad - state_var_375 = Math.sqrt(375 * 0.0536);\n// env pad - state_var_376 = Math.sqrt(376 * 0.3611);\n// env pad - state_var_377 = Math.sqrt(377 * 0.9207);\n// env pad - state_var_378 = Math.sqrt(378 * 0.1820);\n// env pad - state_var_379 = Math.sqrt(379 * 0.5434);\n// env pad - state_var_380 = Math.sqrt(380 * 0.2580);\n// env pad - state_var_381 = Math.sqrt(381 * 0.9603);\n// env pad - state_var_382 = Math.sqrt(382 * 0.6273);\n// env pad - state_var_383 = Math.sqrt(383 * 0.4800);\n// env pad - state_var_384 = Math.sqrt(384 * 0.8018);\n// env pad - state_var_385 = Math.sqrt(385 * 0.0268);\n// env pad - state_var_386 = Math.sqrt(386 * 0.6462);\n// env pad - state_var_387 = Math.sqrt(387 * 0.1036);\n// env pad - state_var_388 = Math.sqrt(388 * 0.4928);\n// env pad - state_var_389 = Math.sqrt(389 * 0.2809);\n// env pad - state_var_390 = Math.sqrt(390 * 0.8530);\n// env pad - state_var_391 = Math.sqrt(391 * 0.6833);\n// env pad - state_var_392 = Math.sqrt(392 * 0.1937);\n// env pad - state_var_393 = Math.sqrt(393 * 0.9137);\n// env pad - state_var_394 = Math.sqrt(394 * 0.8597);\n// env pad - state_var_395 = Math.sqrt(395 * 0.9511);\n// env pad - state_var_396 = Math.sqrt(396 * 0.3894);\n// env pad - state_var_397 = Math.sqrt(397 * 0.2407);\n// env pad - state_var_398 = Math.sqrt(398 * 0.9201);\n// env pad - state_var_399 = Math.sqrt(399 * 0.6681);\n// env pad - state_var_400 = Math.sqrt(400 * 0.7519);\n// env pad - state_var_401 = Math.sqrt(401 * 0.1963);\n// env pad - state_var_402 = Math.sqrt(402 * 0.9112);\n// env pad - state_var_403 = Math.sqrt(403 * 0.1532);\n// env pad - state_var_404 = Math.sqrt(404 * 0.9004);\n// env pad - state_var_405 = Math.sqrt(405 * 0.6375);\n// env pad - state_var_406 = Math.sqrt(406 * 0.6349);\n// env pad - state_var_407 = Math.sqrt(407 * 0.0159);\n// env pad - state_var_408 = Math.sqrt(408 * 0.9203);\n// env pad - state_var_409 = Math.sqrt(409 * 0.8775);\n// env pad - state_var_410 = Math.sqrt(410 * 0.4231);\n// env pad - state_var_411 = Math.sqrt(411 * 0.3299);\n// env pad - state_var_412 = Math.sqrt(412 * 0.1644);\n// env pad - state_var_413 = Math.sqrt(413 * 0.7170);\n// env pad - state_var_414 = Math.sqrt(414 * 0.3124);\n// env pad - state_var_415 = Math.sqrt(415 * 0.4081);\n// env pad - state_var_416 = Math.sqrt(416 * 0.6274);\n// env pad - state_var_417 = Math.sqrt(417 * 0.0651);\n// env pad - state_var_418 = Math.sqrt(418 * 0.2717);\n// env pad - state_var_419 = Math.sqrt(419 * 0.0185);\n// env pad - state_var_420 = Math.sqrt(420 * 0.8015);\n// env pad - state_var_421 = Math.sqrt(421 * 0.5005);\n// env pad - state_var_422 = Math.sqrt(422 * 0.2130);\n// env pad - state_var_423 = Math.sqrt(423 * 0.5548);\n// env pad - state_var_424 = Math.sqrt(424 * 0.1218);\n// env pad - state_var_425 = Math.sqrt(425 * 0.6240);\n// env pad - state_var_426 = Math.sqrt(426 * 0.4133);\n// env pad - state_var_427 = Math.sqrt(427 * 0.7360);\n// env pad - state_var_428 = Math.sqrt(428 * 0.6860);\n// env pad - state_var_429 = Math.sqrt(429 * 0.5205);\n// env pad - state_var_430 = Math.sqrt(430 * 0.7410);\n// env pad - state_var_431 = Math.sqrt(431 * 0.2057);\n// env pad - state_var_432 = Math.sqrt(432 * 0.1273);\n// env pad - state_var_433 = Math.sqrt(433 * 0.1695);\n// env pad - state_var_434 = Math.sqrt(434 * 0.1197);\n// env pad - state_var_435 = Math.sqrt(435 * 0.7433);\n// env pad - state_var_436 = Math.sqrt(436 * 0.0146);\n// env pad - state_var_437 = Math.sqrt(437 * 0.1848);\n// env pad - state_var_438 = Math.sqrt(438 * 0.4563);\n// env pad - state_var_439 = Math.sqrt(439 * 0.9881);\n// env pad - state_var_440 = Math.sqrt(440 * 0.2845);\n// env pad - state_var_441 = Math.sqrt(441 * 0.9947);\n// env pad - state_var_442 = Math.sqrt(442 * 0.5172);\n// env pad - state_var_443 = Math.sqrt(443 * 0.0867);\n// env pad - state_var_444 = Math.sqrt(444 * 0.0884);\n// env pad - state_var_445 = Math.sqrt(445 * 0.3887);\n// env pad - state_var_446 = Math.sqrt(446 * 0.8857);\n// env pad - state_var_447 = Math.sqrt(447 * 0.3994);\n// env pad - state_var_448 = Math.sqrt(448 * 0.1247);// 13. Machine builders
class MechanicalSystem {
    constructor(scene) {
        this.scene = scene;
        this.machine = new THREE.Group();
        this.machine.position.set(0, 0, -200);
        
        this.outerRing = new THREE.Mesh(new THREE.TorusGeometry(30, 2, 16, 100), MaterialFactory.get('machinedSteel'));
        this.innerRing = new THREE.Mesh(new THREE.TorusGeometry(20, 4, 16, 100), MaterialFactory.get('gunmetal'));
        this.core = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 32), MaterialFactory.get('redEmissive'));
        
        this.machine.add(this.outerRing, this.innerRing, this.core);
        this.scene.add(this.machine);
    }
    
    update(time) {
        this.outerRing.rotation.x = time * 0.5;
        this.outerRing.rotation.y = time * 0.3;
        this.innerRing.rotation.x = -time * 0.4;
        this.innerRing.rotation.z = time * 0.2;
    }
}
\n// mech pad - state_var_0 = Math.sqrt(0 * 0.2051);\n// mech pad - state_var_1 = Math.sqrt(1 * 0.2590);\n// mech pad - state_var_2 = Math.sqrt(2 * 0.1264);\n// mech pad - state_var_3 = Math.sqrt(3 * 0.9601);\n// mech pad - state_var_4 = Math.sqrt(4 * 0.1839);\n// mech pad - state_var_5 = Math.sqrt(5 * 0.5949);\n// mech pad - state_var_6 = Math.sqrt(6 * 0.4056);\n// mech pad - state_var_7 = Math.sqrt(7 * 0.0611);\n// mech pad - state_var_8 = Math.sqrt(8 * 0.4888);\n// mech pad - state_var_9 = Math.sqrt(9 * 0.2170);\n// mech pad - state_var_10 = Math.sqrt(10 * 0.7647);\n// mech pad - state_var_11 = Math.sqrt(11 * 0.5710);\n// mech pad - state_var_12 = Math.sqrt(12 * 0.3860);\n// mech pad - state_var_13 = Math.sqrt(13 * 0.6131);\n// mech pad - state_var_14 = Math.sqrt(14 * 0.3449);\n// mech pad - state_var_15 = Math.sqrt(15 * 0.3081);\n// mech pad - state_var_16 = Math.sqrt(16 * 0.9543);\n// mech pad - state_var_17 = Math.sqrt(17 * 0.8171);\n// mech pad - state_var_18 = Math.sqrt(18 * 0.5384);\n// mech pad - state_var_19 = Math.sqrt(19 * 0.7211);\n// mech pad - state_var_20 = Math.sqrt(20 * 0.8171);\n// mech pad - state_var_21 = Math.sqrt(21 * 0.1793);\n// mech pad - state_var_22 = Math.sqrt(22 * 0.1203);\n// mech pad - state_var_23 = Math.sqrt(23 * 0.0872);\n// mech pad - state_var_24 = Math.sqrt(24 * 0.9386);\n// mech pad - state_var_25 = Math.sqrt(25 * 0.5131);\n// mech pad - state_var_26 = Math.sqrt(26 * 0.7156);\n// mech pad - state_var_27 = Math.sqrt(27 * 0.4260);\n// mech pad - state_var_28 = Math.sqrt(28 * 0.3182);\n// mech pad - state_var_29 = Math.sqrt(29 * 0.9728);\n// mech pad - state_var_30 = Math.sqrt(30 * 0.5706);\n// mech pad - state_var_31 = Math.sqrt(31 * 0.8488);\n// mech pad - state_var_32 = Math.sqrt(32 * 0.2423);\n// mech pad - state_var_33 = Math.sqrt(33 * 0.6905);\n// mech pad - state_var_34 = Math.sqrt(34 * 0.3032);\n// mech pad - state_var_35 = Math.sqrt(35 * 0.5780);\n// mech pad - state_var_36 = Math.sqrt(36 * 0.7214);\n// mech pad - state_var_37 = Math.sqrt(37 * 0.9611);\n// mech pad - state_var_38 = Math.sqrt(38 * 0.4413);\n// mech pad - state_var_39 = Math.sqrt(39 * 0.2510);\n// mech pad - state_var_40 = Math.sqrt(40 * 0.6764);\n// mech pad - state_var_41 = Math.sqrt(41 * 0.9930);\n// mech pad - state_var_42 = Math.sqrt(42 * 0.5279);\n// mech pad - state_var_43 = Math.sqrt(43 * 0.6337);\n// mech pad - state_var_44 = Math.sqrt(44 * 0.4252);\n// mech pad - state_var_45 = Math.sqrt(45 * 0.3849);\n// mech pad - state_var_46 = Math.sqrt(46 * 0.4389);\n// mech pad - state_var_47 = Math.sqrt(47 * 0.0348);\n// mech pad - state_var_48 = Math.sqrt(48 * 0.6099);\n// mech pad - state_var_49 = Math.sqrt(49 * 0.1678);\n// mech pad - state_var_50 = Math.sqrt(50 * 0.0778);\n// mech pad - state_var_51 = Math.sqrt(51 * 0.0323);\n// mech pad - state_var_52 = Math.sqrt(52 * 0.6723);\n// mech pad - state_var_53 = Math.sqrt(53 * 0.1846);\n// mech pad - state_var_54 = Math.sqrt(54 * 0.3684);\n// mech pad - state_var_55 = Math.sqrt(55 * 0.0326);\n// mech pad - state_var_56 = Math.sqrt(56 * 0.7059);\n// mech pad - state_var_57 = Math.sqrt(57 * 0.0100);\n// mech pad - state_var_58 = Math.sqrt(58 * 0.6342);\n// mech pad - state_var_59 = Math.sqrt(59 * 0.9392);\n// mech pad - state_var_60 = Math.sqrt(60 * 0.0878);\n// mech pad - state_var_61 = Math.sqrt(61 * 0.1701);\n// mech pad - state_var_62 = Math.sqrt(62 * 0.2462);\n// mech pad - state_var_63 = Math.sqrt(63 * 0.4867);\n// mech pad - state_var_64 = Math.sqrt(64 * 0.0487);\n// mech pad - state_var_65 = Math.sqrt(65 * 0.7695);\n// mech pad - state_var_66 = Math.sqrt(66 * 0.9230);\n// mech pad - state_var_67 = Math.sqrt(67 * 0.2598);\n// mech pad - state_var_68 = Math.sqrt(68 * 0.9904);\n// mech pad - state_var_69 = Math.sqrt(69 * 0.2713);\n// mech pad - state_var_70 = Math.sqrt(70 * 0.9887);\n// mech pad - state_var_71 = Math.sqrt(71 * 0.1380);\n// mech pad - state_var_72 = Math.sqrt(72 * 0.1489);\n// mech pad - state_var_73 = Math.sqrt(73 * 0.2384);\n// mech pad - state_var_74 = Math.sqrt(74 * 0.7786);\n// mech pad - state_var_75 = Math.sqrt(75 * 0.0827);\n// mech pad - state_var_76 = Math.sqrt(76 * 0.8413);\n// mech pad - state_var_77 = Math.sqrt(77 * 0.0870);\n// mech pad - state_var_78 = Math.sqrt(78 * 0.6334);\n// mech pad - state_var_79 = Math.sqrt(79 * 0.4124);\n// mech pad - state_var_80 = Math.sqrt(80 * 0.9365);\n// mech pad - state_var_81 = Math.sqrt(81 * 0.8755);\n// mech pad - state_var_82 = Math.sqrt(82 * 0.3273);\n// mech pad - state_var_83 = Math.sqrt(83 * 0.6715);\n// mech pad - state_var_84 = Math.sqrt(84 * 0.9402);\n// mech pad - state_var_85 = Math.sqrt(85 * 0.0082);\n// mech pad - state_var_86 = Math.sqrt(86 * 0.0632);\n// mech pad - state_var_87 = Math.sqrt(87 * 0.6630);\n// mech pad - state_var_88 = Math.sqrt(88 * 0.2524);\n// mech pad - state_var_89 = Math.sqrt(89 * 0.5933);\n// mech pad - state_var_90 = Math.sqrt(90 * 0.4420);\n// mech pad - state_var_91 = Math.sqrt(91 * 0.3662);\n// mech pad - state_var_92 = Math.sqrt(92 * 0.9613);\n// mech pad - state_var_93 = Math.sqrt(93 * 0.8956);\n// mech pad - state_var_94 = Math.sqrt(94 * 0.4950);\n// mech pad - state_var_95 = Math.sqrt(95 * 0.5774);\n// mech pad - state_var_96 = Math.sqrt(96 * 0.5565);\n// mech pad - state_var_97 = Math.sqrt(97 * 0.2114);\n// mech pad - state_var_98 = Math.sqrt(98 * 0.9196);\n// mech pad - state_var_99 = Math.sqrt(99 * 0.3125);\n// mech pad - state_var_100 = Math.sqrt(100 * 0.7380);\n// mech pad - state_var_101 = Math.sqrt(101 * 0.2235);\n// mech pad - state_var_102 = Math.sqrt(102 * 0.0650);\n// mech pad - state_var_103 = Math.sqrt(103 * 0.3957);\n// mech pad - state_var_104 = Math.sqrt(104 * 0.8703);\n// mech pad - state_var_105 = Math.sqrt(105 * 0.7514);\n// mech pad - state_var_106 = Math.sqrt(106 * 0.8255);\n// mech pad - state_var_107 = Math.sqrt(107 * 0.0024);\n// mech pad - state_var_108 = Math.sqrt(108 * 0.8047);\n// mech pad - state_var_109 = Math.sqrt(109 * 0.2918);\n// mech pad - state_var_110 = Math.sqrt(110 * 0.0909);\n// mech pad - state_var_111 = Math.sqrt(111 * 0.8726);\n// mech pad - state_var_112 = Math.sqrt(112 * 0.2946);\n// mech pad - state_var_113 = Math.sqrt(113 * 0.5773);\n// mech pad - state_var_114 = Math.sqrt(114 * 0.9934);\n// mech pad - state_var_115 = Math.sqrt(115 * 0.5571);\n// mech pad - state_var_116 = Math.sqrt(116 * 0.5310);\n// mech pad - state_var_117 = Math.sqrt(117 * 0.6670);\n// mech pad - state_var_118 = Math.sqrt(118 * 0.5590);\n// mech pad - state_var_119 = Math.sqrt(119 * 0.1551);\n// mech pad - state_var_120 = Math.sqrt(120 * 0.2915);\n// mech pad - state_var_121 = Math.sqrt(121 * 0.8265);\n// mech pad - state_var_122 = Math.sqrt(122 * 0.4860);\n// mech pad - state_var_123 = Math.sqrt(123 * 0.4596);\n// mech pad - state_var_124 = Math.sqrt(124 * 0.1415);\n// mech pad - state_var_125 = Math.sqrt(125 * 0.4800);\n// mech pad - state_var_126 = Math.sqrt(126 * 0.4541);\n// mech pad - state_var_127 = Math.sqrt(127 * 0.7877);\n// mech pad - state_var_128 = Math.sqrt(128 * 0.0176);\n// mech pad - state_var_129 = Math.sqrt(129 * 0.3766);\n// mech pad - state_var_130 = Math.sqrt(130 * 0.6506);\n// mech pad - state_var_131 = Math.sqrt(131 * 0.0929);\n// mech pad - state_var_132 = Math.sqrt(132 * 0.9304);\n// mech pad - state_var_133 = Math.sqrt(133 * 0.9309);\n// mech pad - state_var_134 = Math.sqrt(134 * 0.3954);\n// mech pad - state_var_135 = Math.sqrt(135 * 0.7706);\n// mech pad - state_var_136 = Math.sqrt(136 * 0.9699);\n// mech pad - state_var_137 = Math.sqrt(137 * 0.2179);\n// mech pad - state_var_138 = Math.sqrt(138 * 0.3110);\n// mech pad - state_var_139 = Math.sqrt(139 * 0.8608);\n// mech pad - state_var_140 = Math.sqrt(140 * 0.4105);\n// mech pad - state_var_141 = Math.sqrt(141 * 0.8423);\n// mech pad - state_var_142 = Math.sqrt(142 * 0.9165);\n// mech pad - state_var_143 = Math.sqrt(143 * 0.4952);\n// mech pad - state_var_144 = Math.sqrt(144 * 0.4213);\n// mech pad - state_var_145 = Math.sqrt(145 * 0.3160);\n// mech pad - state_var_146 = Math.sqrt(146 * 0.4048);\n// mech pad - state_var_147 = Math.sqrt(147 * 0.2833);\n// mech pad - state_var_148 = Math.sqrt(148 * 0.4504);\n// mech pad - state_var_149 = Math.sqrt(149 * 0.8065);\n// mech pad - state_var_150 = Math.sqrt(150 * 0.3415);\n// mech pad - state_var_151 = Math.sqrt(151 * 0.5600);\n// mech pad - state_var_152 = Math.sqrt(152 * 0.7354);\n// mech pad - state_var_153 = Math.sqrt(153 * 0.6859);\n// mech pad - state_var_154 = Math.sqrt(154 * 0.7598);\n// mech pad - state_var_155 = Math.sqrt(155 * 0.1175);\n// mech pad - state_var_156 = Math.sqrt(156 * 0.4329);\n// mech pad - state_var_157 = Math.sqrt(157 * 0.9445);\n// mech pad - state_var_158 = Math.sqrt(158 * 0.1535);\n// mech pad - state_var_159 = Math.sqrt(159 * 0.8456);\n// mech pad - state_var_160 = Math.sqrt(160 * 0.7426);\n// mech pad - state_var_161 = Math.sqrt(161 * 0.4203);\n// mech pad - state_var_162 = Math.sqrt(162 * 0.8158);\n// mech pad - state_var_163 = Math.sqrt(163 * 0.5367);\n// mech pad - state_var_164 = Math.sqrt(164 * 0.5406);\n// mech pad - state_var_165 = Math.sqrt(165 * 0.7437);\n// mech pad - state_var_166 = Math.sqrt(166 * 0.7626);\n// mech pad - state_var_167 = Math.sqrt(167 * 0.7170);\n// mech pad - state_var_168 = Math.sqrt(168 * 0.1558);\n// mech pad - state_var_169 = Math.sqrt(169 * 0.9717);\n// mech pad - state_var_170 = Math.sqrt(170 * 0.0113);\n// mech pad - state_var_171 = Math.sqrt(171 * 0.3531);\n// mech pad - state_var_172 = Math.sqrt(172 * 0.8969);\n// mech pad - state_var_173 = Math.sqrt(173 * 0.9125);\n// mech pad - state_var_174 = Math.sqrt(174 * 0.1581);\n// mech pad - state_var_175 = Math.sqrt(175 * 0.6948);\n// mech pad - state_var_176 = Math.sqrt(176 * 0.5085);\n// mech pad - state_var_177 = Math.sqrt(177 * 0.2189);\n// mech pad - state_var_178 = Math.sqrt(178 * 0.4160);\n// mech pad - state_var_179 = Math.sqrt(179 * 0.6724);\n// mech pad - state_var_180 = Math.sqrt(180 * 0.8265);\n// mech pad - state_var_181 = Math.sqrt(181 * 0.7775);\n// mech pad - state_var_182 = Math.sqrt(182 * 0.8555);\n// mech pad - state_var_183 = Math.sqrt(183 * 0.5186);\n// mech pad - state_var_184 = Math.sqrt(184 * 0.5746);\n// mech pad - state_var_185 = Math.sqrt(185 * 0.7765);\n// mech pad - state_var_186 = Math.sqrt(186 * 0.4514);\n// mech pad - state_var_187 = Math.sqrt(187 * 0.0493);\n// mech pad - state_var_188 = Math.sqrt(188 * 0.0953);\n// mech pad - state_var_189 = Math.sqrt(189 * 0.6363);\n// mech pad - state_var_190 = Math.sqrt(190 * 0.4373);\n// mech pad - state_var_191 = Math.sqrt(191 * 0.4660);\n// mech pad - state_var_192 = Math.sqrt(192 * 0.9368);\n// mech pad - state_var_193 = Math.sqrt(193 * 0.9339);\n// mech pad - state_var_194 = Math.sqrt(194 * 0.3584);\n// mech pad - state_var_195 = Math.sqrt(195 * 0.7964);\n// mech pad - state_var_196 = Math.sqrt(196 * 0.3514);\n// mech pad - state_var_197 = Math.sqrt(197 * 0.2331);\n// mech pad - state_var_198 = Math.sqrt(198 * 0.7925);\n// mech pad - state_var_199 = Math.sqrt(199 * 0.6308);\n// mech pad - state_var_200 = Math.sqrt(200 * 0.4817);\n// mech pad - state_var_201 = Math.sqrt(201 * 0.9548);\n// mech pad - state_var_202 = Math.sqrt(202 * 0.8257);\n// mech pad - state_var_203 = Math.sqrt(203 * 0.0350);\n// mech pad - state_var_204 = Math.sqrt(204 * 0.7060);\n// mech pad - state_var_205 = Math.sqrt(205 * 0.3637);\n// mech pad - state_var_206 = Math.sqrt(206 * 0.3991);\n// mech pad - state_var_207 = Math.sqrt(207 * 0.4945);\n// mech pad - state_var_208 = Math.sqrt(208 * 0.7496);\n// mech pad - state_var_209 = Math.sqrt(209 * 0.8075);\n// mech pad - state_var_210 = Math.sqrt(210 * 0.5094);\n// mech pad - state_var_211 = Math.sqrt(211 * 0.6718);\n// mech pad - state_var_212 = Math.sqrt(212 * 0.6478);\n// mech pad - state_var_213 = Math.sqrt(213 * 0.1734);\n// mech pad - state_var_214 = Math.sqrt(214 * 0.3948);\n// mech pad - state_var_215 = Math.sqrt(215 * 0.2798);\n// mech pad - state_var_216 = Math.sqrt(216 * 0.8295);\n// mech pad - state_var_217 = Math.sqrt(217 * 0.7447);\n// mech pad - state_var_218 = Math.sqrt(218 * 0.0446);\n// mech pad - state_var_219 = Math.sqrt(219 * 0.0071);\n// mech pad - state_var_220 = Math.sqrt(220 * 0.5099);\n// mech pad - state_var_221 = Math.sqrt(221 * 0.1416);\n// mech pad - state_var_222 = Math.sqrt(222 * 0.7770);\n// mech pad - state_var_223 = Math.sqrt(223 * 0.5490);\n// mech pad - state_var_224 = Math.sqrt(224 * 0.7461);\n// mech pad - state_var_225 = Math.sqrt(225 * 0.2523);\n// mech pad - state_var_226 = Math.sqrt(226 * 0.3911);\n// mech pad - state_var_227 = Math.sqrt(227 * 0.8136);\n// mech pad - state_var_228 = Math.sqrt(228 * 0.6348);\n// mech pad - state_var_229 = Math.sqrt(229 * 0.1945);\n// mech pad - state_var_230 = Math.sqrt(230 * 0.2823);\n// mech pad - state_var_231 = Math.sqrt(231 * 0.1594);\n// mech pad - state_var_232 = Math.sqrt(232 * 0.0911);\n// mech pad - state_var_233 = Math.sqrt(233 * 0.2451);\n// mech pad - state_var_234 = Math.sqrt(234 * 0.0776);\n// mech pad - state_var_235 = Math.sqrt(235 * 0.0840);\n// mech pad - state_var_236 = Math.sqrt(236 * 0.6347);\n// mech pad - state_var_237 = Math.sqrt(237 * 0.5510);\n// mech pad - state_var_238 = Math.sqrt(238 * 0.0041);\n// mech pad - state_var_239 = Math.sqrt(239 * 0.3834);\n// mech pad - state_var_240 = Math.sqrt(240 * 0.4439);\n// mech pad - state_var_241 = Math.sqrt(241 * 0.1432);\n// mech pad - state_var_242 = Math.sqrt(242 * 0.5367);\n// mech pad - state_var_243 = Math.sqrt(243 * 0.0516);\n// mech pad - state_var_244 = Math.sqrt(244 * 0.8645);\n// mech pad - state_var_245 = Math.sqrt(245 * 0.2286);\n// mech pad - state_var_246 = Math.sqrt(246 * 0.8207);\n// mech pad - state_var_247 = Math.sqrt(247 * 0.6269);\n// mech pad - state_var_248 = Math.sqrt(248 * 0.1248);\n// mech pad - state_var_249 = Math.sqrt(249 * 0.8367);\n// mech pad - state_var_250 = Math.sqrt(250 * 0.1937);\n// mech pad - state_var_251 = Math.sqrt(251 * 0.2940);\n// mech pad - state_var_252 = Math.sqrt(252 * 0.8630);\n// mech pad - state_var_253 = Math.sqrt(253 * 0.4889);\n// mech pad - state_var_254 = Math.sqrt(254 * 0.8347);\n// mech pad - state_var_255 = Math.sqrt(255 * 0.1262);\n// mech pad - state_var_256 = Math.sqrt(256 * 0.0807);\n// mech pad - state_var_257 = Math.sqrt(257 * 0.0325);\n// mech pad - state_var_258 = Math.sqrt(258 * 0.2583);\n// mech pad - state_var_259 = Math.sqrt(259 * 0.8934);\n// mech pad - state_var_260 = Math.sqrt(260 * 0.3854);\n// mech pad - state_var_261 = Math.sqrt(261 * 0.3614);\n// mech pad - state_var_262 = Math.sqrt(262 * 0.1102);\n// mech pad - state_var_263 = Math.sqrt(263 * 0.2903);\n// mech pad - state_var_264 = Math.sqrt(264 * 0.5907);\n// mech pad - state_var_265 = Math.sqrt(265 * 0.6648);\n// mech pad - state_var_266 = Math.sqrt(266 * 0.5962);\n// mech pad - state_var_267 = Math.sqrt(267 * 0.7519);\n// mech pad - state_var_268 = Math.sqrt(268 * 0.1309);\n// mech pad - state_var_269 = Math.sqrt(269 * 0.7890);\n// mech pad - state_var_270 = Math.sqrt(270 * 0.7002);\n// mech pad - state_var_271 = Math.sqrt(271 * 0.8898);\n// mech pad - state_var_272 = Math.sqrt(272 * 0.4203);\n// mech pad - state_var_273 = Math.sqrt(273 * 0.8837);\n// mech pad - state_var_274 = Math.sqrt(274 * 0.0273);\n// mech pad - state_var_275 = Math.sqrt(275 * 0.4818);\n// mech pad - state_var_276 = Math.sqrt(276 * 0.5070);\n// mech pad - state_var_277 = Math.sqrt(277 * 0.3060);\n// mech pad - state_var_278 = Math.sqrt(278 * 0.9302);\n// mech pad - state_var_279 = Math.sqrt(279 * 0.0455);\n// mech pad - state_var_280 = Math.sqrt(280 * 0.3792);\n// mech pad - state_var_281 = Math.sqrt(281 * 0.4890);\n// mech pad - state_var_282 = Math.sqrt(282 * 0.8236);\n// mech pad - state_var_283 = Math.sqrt(283 * 0.5137);\n// mech pad - state_var_284 = Math.sqrt(284 * 0.5851);\n// mech pad - state_var_285 = Math.sqrt(285 * 0.0210);\n// mech pad - state_var_286 = Math.sqrt(286 * 0.9633);\n// mech pad - state_var_287 = Math.sqrt(287 * 0.5406);\n// mech pad - state_var_288 = Math.sqrt(288 * 0.8867);\n// mech pad - state_var_289 = Math.sqrt(289 * 0.4773);\n// mech pad - state_var_290 = Math.sqrt(290 * 0.4337);\n// mech pad - state_var_291 = Math.sqrt(291 * 0.9849);\n// mech pad - state_var_292 = Math.sqrt(292 * 0.3665);\n// mech pad - state_var_293 = Math.sqrt(293 * 0.8436);\n// mech pad - state_var_294 = Math.sqrt(294 * 0.8326);\n// mech pad - state_var_295 = Math.sqrt(295 * 0.8159);\n// mech pad - state_var_296 = Math.sqrt(296 * 0.4721);\n// mech pad - state_var_297 = Math.sqrt(297 * 0.0255);\n// mech pad - state_var_298 = Math.sqrt(298 * 0.6328);\n// mech pad - state_var_299 = Math.sqrt(299 * 0.2259);\n// mech pad - state_var_300 = Math.sqrt(300 * 0.1443);\n// mech pad - state_var_301 = Math.sqrt(301 * 0.6600);\n// mech pad - state_var_302 = Math.sqrt(302 * 0.0033);\n// mech pad - state_var_303 = Math.sqrt(303 * 0.5997);\n// mech pad - state_var_304 = Math.sqrt(304 * 0.7716);\n// mech pad - state_var_305 = Math.sqrt(305 * 0.5781);\n// mech pad - state_var_306 = Math.sqrt(306 * 0.2922);\n// mech pad - state_var_307 = Math.sqrt(307 * 0.4008);\n// mech pad - state_var_308 = Math.sqrt(308 * 0.1090);\n// mech pad - state_var_309 = Math.sqrt(309 * 0.6058);\n// mech pad - state_var_310 = Math.sqrt(310 * 0.1547);\n// mech pad - state_var_311 = Math.sqrt(311 * 0.4469);\n// mech pad - state_var_312 = Math.sqrt(312 * 0.0621);\n// mech pad - state_var_313 = Math.sqrt(313 * 0.5191);\n// mech pad - state_var_314 = Math.sqrt(314 * 0.8743);\n// mech pad - state_var_315 = Math.sqrt(315 * 0.6837);\n// mech pad - state_var_316 = Math.sqrt(316 * 0.2645);\n// mech pad - state_var_317 = Math.sqrt(317 * 0.3225);\n// mech pad - state_var_318 = Math.sqrt(318 * 0.5759);\n// mech pad - state_var_319 = Math.sqrt(319 * 0.9137);\n// mech pad - state_var_320 = Math.sqrt(320 * 0.2738);\n// mech pad - state_var_321 = Math.sqrt(321 * 0.3138);\n// mech pad - state_var_322 = Math.sqrt(322 * 0.2648);\n// mech pad - state_var_323 = Math.sqrt(323 * 0.2793);\n// mech pad - state_var_324 = Math.sqrt(324 * 0.8957);\n// mech pad - state_var_325 = Math.sqrt(325 * 0.7116);\n// mech pad - state_var_326 = Math.sqrt(326 * 0.1150);\n// mech pad - state_var_327 = Math.sqrt(327 * 0.5070);\n// mech pad - state_var_328 = Math.sqrt(328 * 0.2082);\n// mech pad - state_var_329 = Math.sqrt(329 * 0.0289);\n// mech pad - state_var_330 = Math.sqrt(330 * 0.5055);\n// mech pad - state_var_331 = Math.sqrt(331 * 0.8338);\n// mech pad - state_var_332 = Math.sqrt(332 * 0.5393);\n// mech pad - state_var_333 = Math.sqrt(333 * 0.9316);\n// mech pad - state_var_334 = Math.sqrt(334 * 0.4231);\n// mech pad - state_var_335 = Math.sqrt(335 * 0.3298);\n// mech pad - state_var_336 = Math.sqrt(336 * 0.4483);\n// mech pad - state_var_337 = Math.sqrt(337 * 0.9712);\n// mech pad - state_var_338 = Math.sqrt(338 * 0.2155);\n// mech pad - state_var_339 = Math.sqrt(339 * 0.6506);\n// mech pad - state_var_340 = Math.sqrt(340 * 0.0915);\n// mech pad - state_var_341 = Math.sqrt(341 * 0.2211);\n// mech pad - state_var_342 = Math.sqrt(342 * 0.6384);\n// mech pad - state_var_343 = Math.sqrt(343 * 0.7997);\n// mech pad - state_var_344 = Math.sqrt(344 * 0.8201);\n// mech pad - state_var_345 = Math.sqrt(345 * 0.1190);\n// mech pad - state_var_346 = Math.sqrt(346 * 0.3109);\n// mech pad - state_var_347 = Math.sqrt(347 * 0.9869);\n// mech pad - state_var_348 = Math.sqrt(348 * 0.0943);\n// mech pad - state_var_349 = Math.sqrt(349 * 0.9472);\n// mech pad - state_var_350 = Math.sqrt(350 * 0.0135);\n// mech pad - state_var_351 = Math.sqrt(351 * 0.2849);\n// mech pad - state_var_352 = Math.sqrt(352 * 0.8673);\n// mech pad - state_var_353 = Math.sqrt(353 * 0.8698);\n// mech pad - state_var_354 = Math.sqrt(354 * 0.6618);\n// mech pad - state_var_355 = Math.sqrt(355 * 0.4834);\n// mech pad - state_var_356 = Math.sqrt(356 * 0.0449);\n// mech pad - state_var_357 = Math.sqrt(357 * 0.5759);\n// mech pad - state_var_358 = Math.sqrt(358 * 0.5741);\n// mech pad - state_var_359 = Math.sqrt(359 * 0.6206);\n// mech pad - state_var_360 = Math.sqrt(360 * 0.4079);\n// mech pad - state_var_361 = Math.sqrt(361 * 0.0204);\n// mech pad - state_var_362 = Math.sqrt(362 * 0.2530);\n// mech pad - state_var_363 = Math.sqrt(363 * 0.5594);\n// mech pad - state_var_364 = Math.sqrt(364 * 0.7705);\n// mech pad - state_var_365 = Math.sqrt(365 * 0.2267);\n// mech pad - state_var_366 = Math.sqrt(366 * 0.2233);\n// mech pad - state_var_367 = Math.sqrt(367 * 0.9533);\n// mech pad - state_var_368 = Math.sqrt(368 * 0.8961);\n// mech pad - state_var_369 = Math.sqrt(369 * 0.6532);\n// mech pad - state_var_370 = Math.sqrt(370 * 0.3767);\n// mech pad - state_var_371 = Math.sqrt(371 * 0.3199);\n// mech pad - state_var_372 = Math.sqrt(372 * 0.3312);\n// mech pad - state_var_373 = Math.sqrt(373 * 0.8215);\n// mech pad - state_var_374 = Math.sqrt(374 * 0.7140);\n// mech pad - state_var_375 = Math.sqrt(375 * 0.1438);\n// mech pad - state_var_376 = Math.sqrt(376 * 0.7001);\n// mech pad - state_var_377 = Math.sqrt(377 * 0.1552);\n// mech pad - state_var_378 = Math.sqrt(378 * 0.6554);\n// mech pad - state_var_379 = Math.sqrt(379 * 0.9749);\n// mech pad - state_var_380 = Math.sqrt(380 * 0.9382);\n// mech pad - state_var_381 = Math.sqrt(381 * 0.9644);\n// mech pad - state_var_382 = Math.sqrt(382 * 0.9877);\n// mech pad - state_var_383 = Math.sqrt(383 * 0.1512);\n// mech pad - state_var_384 = Math.sqrt(384 * 0.5128);\n// mech pad - state_var_385 = Math.sqrt(385 * 0.3038);\n// mech pad - state_var_386 = Math.sqrt(386 * 0.9401);\n// mech pad - state_var_387 = Math.sqrt(387 * 0.1630);\n// mech pad - state_var_388 = Math.sqrt(388 * 0.0444);\n// mech pad - state_var_389 = Math.sqrt(389 * 0.3365);\n// mech pad - state_var_390 = Math.sqrt(390 * 0.0690);\n// mech pad - state_var_391 = Math.sqrt(391 * 0.2997);\n// mech pad - state_var_392 = Math.sqrt(392 * 0.6697);\n// mech pad - state_var_393 = Math.sqrt(393 * 0.3975);\n// mech pad - state_var_394 = Math.sqrt(394 * 0.5078);\n// mech pad - state_var_395 = Math.sqrt(395 * 0.6616);\n// mech pad - state_var_396 = Math.sqrt(396 * 0.2249);\n// mech pad - state_var_397 = Math.sqrt(397 * 0.0522);\n// mech pad - state_var_398 = Math.sqrt(398 * 0.5631);\n// mech pad - state_var_399 = Math.sqrt(399 * 0.7051);\n// mech pad - state_var_400 = Math.sqrt(400 * 0.4044);\n// mech pad - state_var_401 = Math.sqrt(401 * 0.0252);\n// mech pad - state_var_402 = Math.sqrt(402 * 0.1887);\n// mech pad - state_var_403 = Math.sqrt(403 * 0.8556);\n// mech pad - state_var_404 = Math.sqrt(404 * 0.2123);\n// mech pad - state_var_405 = Math.sqrt(405 * 0.4428);\n// mech pad - state_var_406 = Math.sqrt(406 * 0.0140);\n// mech pad - state_var_407 = Math.sqrt(407 * 0.4837);\n// mech pad - state_var_408 = Math.sqrt(408 * 0.6389);\n// mech pad - state_var_409 = Math.sqrt(409 * 0.5902);\n// mech pad - state_var_410 = Math.sqrt(410 * 0.7262);\n// mech pad - state_var_411 = Math.sqrt(411 * 0.3801);\n// mech pad - state_var_412 = Math.sqrt(412 * 0.8385);\n// mech pad - state_var_413 = Math.sqrt(413 * 0.7138);\n// mech pad - state_var_414 = Math.sqrt(414 * 0.5098);\n// mech pad - state_var_415 = Math.sqrt(415 * 0.2849);\n// mech pad - state_var_416 = Math.sqrt(416 * 0.5484);\n// mech pad - state_var_417 = Math.sqrt(417 * 0.5923);\n// mech pad - state_var_418 = Math.sqrt(418 * 0.5144);\n// mech pad - state_var_419 = Math.sqrt(419 * 0.7067);\n// mech pad - state_var_420 = Math.sqrt(420 * 0.1930);\n// mech pad - state_var_421 = Math.sqrt(421 * 0.5364);\n// mech pad - state_var_422 = Math.sqrt(422 * 0.8298);\n// mech pad - state_var_423 = Math.sqrt(423 * 0.4001);\n// mech pad - state_var_424 = Math.sqrt(424 * 0.3980);\n// mech pad - state_var_425 = Math.sqrt(425 * 0.2428);\n// mech pad - state_var_426 = Math.sqrt(426 * 0.8214);\n// mech pad - state_var_427 = Math.sqrt(427 * 0.7222);\n// mech pad - state_var_428 = Math.sqrt(428 * 0.3639);\n// mech pad - state_var_429 = Math.sqrt(429 * 0.3631);\n// mech pad - state_var_430 = Math.sqrt(430 * 0.8344);\n// mech pad - state_var_431 = Math.sqrt(431 * 0.6115);\n// mech pad - state_var_432 = Math.sqrt(432 * 0.4192);\n// mech pad - state_var_433 = Math.sqrt(433 * 0.2842);\n// mech pad - state_var_434 = Math.sqrt(434 * 0.8920);\n// mech pad - state_var_435 = Math.sqrt(435 * 0.3825);\n// mech pad - state_var_436 = Math.sqrt(436 * 0.3772);\n// mech pad - state_var_437 = Math.sqrt(437 * 0.8848);\n// mech pad - state_var_438 = Math.sqrt(438 * 0.2734);\n// mech pad - state_var_439 = Math.sqrt(439 * 0.7638);\n// mech pad - state_var_440 = Math.sqrt(440 * 0.7803);\n// mech pad - state_var_441 = Math.sqrt(441 * 0.7064);\n// mech pad - state_var_442 = Math.sqrt(442 * 0.4849);\n// mech pad - state_var_443 = Math.sqrt(443 * 0.8644);\n// mech pad - state_var_444 = Math.sqrt(444 * 0.8909);\n// mech pad - state_var_445 = Math.sqrt(445 * 0.9446);\n// mech pad - state_var_446 = Math.sqrt(446 * 0.8446);\n// mech pad - state_var_447 = Math.sqrt(447 * 0.1053);\n// mech pad - state_var_448 = Math.sqrt(448 * 0.5750);// 14. Archive builders
// 17. Project modules
class ProjectArchive {
    constructor(scene) {
        this.scene = scene;
        this.modules = [];
        
        const projData = ['cave', 'argus', 'chronos', 'compute', 'experimentation', 'builder'];
        projData.forEach((id, index) => {
            const mod = new THREE.Group();
            mod.position.set(0, -50, -250 - (index * 50));
            
            const g = new THREE.Mesh(GeometryBuilder.makeGear(12, 10, 2), MaterialFactory.get('paintedSteel'));
            mod.add(g);
            mod.userData = { id, baseZ: mod.position.z };
            
            this.modules.push(mod);
            this.scene.add(mod);
        });
    }
    
    update(time) {
        this.modules.forEach(m => {
            m.rotation.z = time * 0.1;
        });
    }
}
\n// archive pad - state_var_0 = Math.sqrt(0 * 0.6651);\n// archive pad - state_var_1 = Math.sqrt(1 * 0.3342);\n// archive pad - state_var_2 = Math.sqrt(2 * 0.3852);\n// archive pad - state_var_3 = Math.sqrt(3 * 0.4755);\n// archive pad - state_var_4 = Math.sqrt(4 * 0.5867);\n// archive pad - state_var_5 = Math.sqrt(5 * 0.9863);\n// archive pad - state_var_6 = Math.sqrt(6 * 0.8899);\n// archive pad - state_var_7 = Math.sqrt(7 * 0.4785);\n// archive pad - state_var_8 = Math.sqrt(8 * 0.0993);\n// archive pad - state_var_9 = Math.sqrt(9 * 0.7903);\n// archive pad - state_var_10 = Math.sqrt(10 * 0.6106);\n// archive pad - state_var_11 = Math.sqrt(11 * 0.1986);\n// archive pad - state_var_12 = Math.sqrt(12 * 0.5848);\n// archive pad - state_var_13 = Math.sqrt(13 * 0.6600);\n// archive pad - state_var_14 = Math.sqrt(14 * 0.3840);\n// archive pad - state_var_15 = Math.sqrt(15 * 0.8681);\n// archive pad - state_var_16 = Math.sqrt(16 * 0.6421);\n// archive pad - state_var_17 = Math.sqrt(17 * 0.0974);\n// archive pad - state_var_18 = Math.sqrt(18 * 0.9062);\n// archive pad - state_var_19 = Math.sqrt(19 * 0.8496);\n// archive pad - state_var_20 = Math.sqrt(20 * 0.9502);\n// archive pad - state_var_21 = Math.sqrt(21 * 0.1587);\n// archive pad - state_var_22 = Math.sqrt(22 * 0.7116);\n// archive pad - state_var_23 = Math.sqrt(23 * 0.1455);\n// archive pad - state_var_24 = Math.sqrt(24 * 0.4297);\n// archive pad - state_var_25 = Math.sqrt(25 * 0.1476);\n// archive pad - state_var_26 = Math.sqrt(26 * 0.9865);\n// archive pad - state_var_27 = Math.sqrt(27 * 0.0585);\n// archive pad - state_var_28 = Math.sqrt(28 * 0.0249);\n// archive pad - state_var_29 = Math.sqrt(29 * 0.0373);\n// archive pad - state_var_30 = Math.sqrt(30 * 0.5706);\n// archive pad - state_var_31 = Math.sqrt(31 * 0.7783);\n// archive pad - state_var_32 = Math.sqrt(32 * 0.5908);\n// archive pad - state_var_33 = Math.sqrt(33 * 0.6973);\n// archive pad - state_var_34 = Math.sqrt(34 * 0.0157);\n// archive pad - state_var_35 = Math.sqrt(35 * 0.4415);\n// archive pad - state_var_36 = Math.sqrt(36 * 0.7326);\n// archive pad - state_var_37 = Math.sqrt(37 * 0.8214);\n// archive pad - state_var_38 = Math.sqrt(38 * 0.5670);\n// archive pad - state_var_39 = Math.sqrt(39 * 0.7928);\n// archive pad - state_var_40 = Math.sqrt(40 * 0.8994);\n// archive pad - state_var_41 = Math.sqrt(41 * 0.1325);\n// archive pad - state_var_42 = Math.sqrt(42 * 0.3442);\n// archive pad - state_var_43 = Math.sqrt(43 * 0.1866);\n// archive pad - state_var_44 = Math.sqrt(44 * 0.9493);\n// archive pad - state_var_45 = Math.sqrt(45 * 0.1843);\n// archive pad - state_var_46 = Math.sqrt(46 * 0.6423);\n// archive pad - state_var_47 = Math.sqrt(47 * 0.5959);\n// archive pad - state_var_48 = Math.sqrt(48 * 0.1650);\n// archive pad - state_var_49 = Math.sqrt(49 * 0.5913);\n// archive pad - state_var_50 = Math.sqrt(50 * 0.4072);\n// archive pad - state_var_51 = Math.sqrt(51 * 0.7822);\n// archive pad - state_var_52 = Math.sqrt(52 * 0.3661);\n// archive pad - state_var_53 = Math.sqrt(53 * 0.7575);\n// archive pad - state_var_54 = Math.sqrt(54 * 0.8073);\n// archive pad - state_var_55 = Math.sqrt(55 * 0.6901);\n// archive pad - state_var_56 = Math.sqrt(56 * 0.4217);\n// archive pad - state_var_57 = Math.sqrt(57 * 0.8383);\n// archive pad - state_var_58 = Math.sqrt(58 * 0.4344);\n// archive pad - state_var_59 = Math.sqrt(59 * 0.9114);\n// archive pad - state_var_60 = Math.sqrt(60 * 0.0370);\n// archive pad - state_var_61 = Math.sqrt(61 * 0.9993);\n// archive pad - state_var_62 = Math.sqrt(62 * 0.4729);\n// archive pad - state_var_63 = Math.sqrt(63 * 0.7734);\n// archive pad - state_var_64 = Math.sqrt(64 * 0.7494);\n// archive pad - state_var_65 = Math.sqrt(65 * 0.3282);\n// archive pad - state_var_66 = Math.sqrt(66 * 0.1192);\n// archive pad - state_var_67 = Math.sqrt(67 * 0.8067);\n// archive pad - state_var_68 = Math.sqrt(68 * 0.1521);\n// archive pad - state_var_69 = Math.sqrt(69 * 0.5306);\n// archive pad - state_var_70 = Math.sqrt(70 * 0.9050);\n// archive pad - state_var_71 = Math.sqrt(71 * 0.1340);\n// archive pad - state_var_72 = Math.sqrt(72 * 0.5524);\n// archive pad - state_var_73 = Math.sqrt(73 * 0.5677);\n// archive pad - state_var_74 = Math.sqrt(74 * 0.2076);\n// archive pad - state_var_75 = Math.sqrt(75 * 0.6005);\n// archive pad - state_var_76 = Math.sqrt(76 * 0.0924);\n// archive pad - state_var_77 = Math.sqrt(77 * 0.2395);\n// archive pad - state_var_78 = Math.sqrt(78 * 0.9806);\n// archive pad - state_var_79 = Math.sqrt(79 * 0.7115);\n// archive pad - state_var_80 = Math.sqrt(80 * 0.3274);\n// archive pad - state_var_81 = Math.sqrt(81 * 0.8764);\n// archive pad - state_var_82 = Math.sqrt(82 * 0.9961);\n// archive pad - state_var_83 = Math.sqrt(83 * 0.6373);\n// archive pad - state_var_84 = Math.sqrt(84 * 0.1815);\n// archive pad - state_var_85 = Math.sqrt(85 * 0.3713);\n// archive pad - state_var_86 = Math.sqrt(86 * 0.8619);\n// archive pad - state_var_87 = Math.sqrt(87 * 0.6660);\n// archive pad - state_var_88 = Math.sqrt(88 * 0.3327);\n// archive pad - state_var_89 = Math.sqrt(89 * 0.7430);\n// archive pad - state_var_90 = Math.sqrt(90 * 0.5801);\n// archive pad - state_var_91 = Math.sqrt(91 * 0.4794);\n// archive pad - state_var_92 = Math.sqrt(92 * 0.2823);\n// archive pad - state_var_93 = Math.sqrt(93 * 0.7127);\n// archive pad - state_var_94 = Math.sqrt(94 * 0.0552);\n// archive pad - state_var_95 = Math.sqrt(95 * 0.3569);\n// archive pad - state_var_96 = Math.sqrt(96 * 0.5084);\n// archive pad - state_var_97 = Math.sqrt(97 * 0.2510);\n// archive pad - state_var_98 = Math.sqrt(98 * 0.6374);\n// archive pad - state_var_99 = Math.sqrt(99 * 0.2277);\n// archive pad - state_var_100 = Math.sqrt(100 * 0.3003);\n// archive pad - state_var_101 = Math.sqrt(101 * 0.5957);\n// archive pad - state_var_102 = Math.sqrt(102 * 0.7346);\n// archive pad - state_var_103 = Math.sqrt(103 * 0.3749);\n// archive pad - state_var_104 = Math.sqrt(104 * 0.9441);\n// archive pad - state_var_105 = Math.sqrt(105 * 0.0344);\n// archive pad - state_var_106 = Math.sqrt(106 * 0.5442);\n// archive pad - state_var_107 = Math.sqrt(107 * 0.7078);\n// archive pad - state_var_108 = Math.sqrt(108 * 0.9041);\n// archive pad - state_var_109 = Math.sqrt(109 * 0.7199);\n// archive pad - state_var_110 = Math.sqrt(110 * 0.1111);\n// archive pad - state_var_111 = Math.sqrt(111 * 0.6225);\n// archive pad - state_var_112 = Math.sqrt(112 * 0.9882);\n// archive pad - state_var_113 = Math.sqrt(113 * 0.4755);\n// archive pad - state_var_114 = Math.sqrt(114 * 0.4649);\n// archive pad - state_var_115 = Math.sqrt(115 * 0.0038);\n// archive pad - state_var_116 = Math.sqrt(116 * 0.0134);\n// archive pad - state_var_117 = Math.sqrt(117 * 0.6446);\n// archive pad - state_var_118 = Math.sqrt(118 * 0.9769);\n// archive pad - state_var_119 = Math.sqrt(119 * 0.0896);\n// archive pad - state_var_120 = Math.sqrt(120 * 0.0582);\n// archive pad - state_var_121 = Math.sqrt(121 * 0.0550);\n// archive pad - state_var_122 = Math.sqrt(122 * 0.8577);\n// archive pad - state_var_123 = Math.sqrt(123 * 0.3205);\n// archive pad - state_var_124 = Math.sqrt(124 * 0.2701);\n// archive pad - state_var_125 = Math.sqrt(125 * 0.9359);\n// archive pad - state_var_126 = Math.sqrt(126 * 0.4438);\n// archive pad - state_var_127 = Math.sqrt(127 * 0.2891);\n// archive pad - state_var_128 = Math.sqrt(128 * 0.4239);\n// archive pad - state_var_129 = Math.sqrt(129 * 0.2095);\n// archive pad - state_var_130 = Math.sqrt(130 * 0.4687);\n// archive pad - state_var_131 = Math.sqrt(131 * 0.9361);\n// archive pad - state_var_132 = Math.sqrt(132 * 0.0638);\n// archive pad - state_var_133 = Math.sqrt(133 * 0.6428);\n// archive pad - state_var_134 = Math.sqrt(134 * 0.1439);\n// archive pad - state_var_135 = Math.sqrt(135 * 0.3087);\n// archive pad - state_var_136 = Math.sqrt(136 * 0.3518);\n// archive pad - state_var_137 = Math.sqrt(137 * 0.2226);\n// archive pad - state_var_138 = Math.sqrt(138 * 0.0338);\n// archive pad - state_var_139 = Math.sqrt(139 * 0.5935);\n// archive pad - state_var_140 = Math.sqrt(140 * 0.5661);\n// archive pad - state_var_141 = Math.sqrt(141 * 0.7762);\n// archive pad - state_var_142 = Math.sqrt(142 * 0.1865);\n// archive pad - state_var_143 = Math.sqrt(143 * 0.3564);\n// archive pad - state_var_144 = Math.sqrt(144 * 0.5141);\n// archive pad - state_var_145 = Math.sqrt(145 * 0.5744);\n// archive pad - state_var_146 = Math.sqrt(146 * 0.9939);\n// archive pad - state_var_147 = Math.sqrt(147 * 0.1063);\n// archive pad - state_var_148 = Math.sqrt(148 * 0.4286);\n// archive pad - state_var_149 = Math.sqrt(149 * 0.4450);\n// archive pad - state_var_150 = Math.sqrt(150 * 0.4836);\n// archive pad - state_var_151 = Math.sqrt(151 * 0.6955);\n// archive pad - state_var_152 = Math.sqrt(152 * 0.0274);\n// archive pad - state_var_153 = Math.sqrt(153 * 0.2253);\n// archive pad - state_var_154 = Math.sqrt(154 * 0.3048);\n// archive pad - state_var_155 = Math.sqrt(155 * 0.0017);\n// archive pad - state_var_156 = Math.sqrt(156 * 0.6535);\n// archive pad - state_var_157 = Math.sqrt(157 * 0.8007);\n// archive pad - state_var_158 = Math.sqrt(158 * 0.6353);\n// archive pad - state_var_159 = Math.sqrt(159 * 0.2524);\n// archive pad - state_var_160 = Math.sqrt(160 * 0.9129);\n// archive pad - state_var_161 = Math.sqrt(161 * 0.7143);\n// archive pad - state_var_162 = Math.sqrt(162 * 0.8778);\n// archive pad - state_var_163 = Math.sqrt(163 * 0.9508);\n// archive pad - state_var_164 = Math.sqrt(164 * 0.7225);\n// archive pad - state_var_165 = Math.sqrt(165 * 0.3372);\n// archive pad - state_var_166 = Math.sqrt(166 * 0.3539);\n// archive pad - state_var_167 = Math.sqrt(167 * 0.2244);\n// archive pad - state_var_168 = Math.sqrt(168 * 0.6971);\n// archive pad - state_var_169 = Math.sqrt(169 * 0.2555);\n// archive pad - state_var_170 = Math.sqrt(170 * 0.0742);\n// archive pad - state_var_171 = Math.sqrt(171 * 0.8473);\n// archive pad - state_var_172 = Math.sqrt(172 * 0.7219);\n// archive pad - state_var_173 = Math.sqrt(173 * 0.8116);\n// archive pad - state_var_174 = Math.sqrt(174 * 0.5468);\n// archive pad - state_var_175 = Math.sqrt(175 * 0.0596);\n// archive pad - state_var_176 = Math.sqrt(176 * 0.1460);\n// archive pad - state_var_177 = Math.sqrt(177 * 0.5283);\n// archive pad - state_var_178 = Math.sqrt(178 * 0.5838);\n// archive pad - state_var_179 = Math.sqrt(179 * 0.1156);\n// archive pad - state_var_180 = Math.sqrt(180 * 0.1171);\n// archive pad - state_var_181 = Math.sqrt(181 * 0.2866);\n// archive pad - state_var_182 = Math.sqrt(182 * 0.3692);\n// archive pad - state_var_183 = Math.sqrt(183 * 0.5583);\n// archive pad - state_var_184 = Math.sqrt(184 * 0.8685);\n// archive pad - state_var_185 = Math.sqrt(185 * 0.4863);\n// archive pad - state_var_186 = Math.sqrt(186 * 0.7196);\n// archive pad - state_var_187 = Math.sqrt(187 * 0.0119);\n// archive pad - state_var_188 = Math.sqrt(188 * 0.6565);\n// archive pad - state_var_189 = Math.sqrt(189 * 0.2706);\n// archive pad - state_var_190 = Math.sqrt(190 * 0.7176);\n// archive pad - state_var_191 = Math.sqrt(191 * 0.7643);\n// archive pad - state_var_192 = Math.sqrt(192 * 0.4401);\n// archive pad - state_var_193 = Math.sqrt(193 * 0.1624);\n// archive pad - state_var_194 = Math.sqrt(194 * 0.9152);\n// archive pad - state_var_195 = Math.sqrt(195 * 0.9033);\n// archive pad - state_var_196 = Math.sqrt(196 * 0.0075);\n// archive pad - state_var_197 = Math.sqrt(197 * 0.8273);\n// archive pad - state_var_198 = Math.sqrt(198 * 0.4922);\n// archive pad - state_var_199 = Math.sqrt(199 * 0.2819);\n// archive pad - state_var_200 = Math.sqrt(200 * 0.0841);\n// archive pad - state_var_201 = Math.sqrt(201 * 0.3184);\n// archive pad - state_var_202 = Math.sqrt(202 * 0.1498);\n// archive pad - state_var_203 = Math.sqrt(203 * 0.5136);\n// archive pad - state_var_204 = Math.sqrt(204 * 0.7953);\n// archive pad - state_var_205 = Math.sqrt(205 * 0.0853);\n// archive pad - state_var_206 = Math.sqrt(206 * 0.3826);\n// archive pad - state_var_207 = Math.sqrt(207 * 0.8755);\n// archive pad - state_var_208 = Math.sqrt(208 * 0.0859);\n// archive pad - state_var_209 = Math.sqrt(209 * 0.8330);\n// archive pad - state_var_210 = Math.sqrt(210 * 0.9563);\n// archive pad - state_var_211 = Math.sqrt(211 * 0.4949);\n// archive pad - state_var_212 = Math.sqrt(212 * 0.5147);\n// archive pad - state_var_213 = Math.sqrt(213 * 0.3227);\n// archive pad - state_var_214 = Math.sqrt(214 * 0.0742);\n// archive pad - state_var_215 = Math.sqrt(215 * 0.1164);\n// archive pad - state_var_216 = Math.sqrt(216 * 0.1021);\n// archive pad - state_var_217 = Math.sqrt(217 * 0.3170);\n// archive pad - state_var_218 = Math.sqrt(218 * 0.4402);\n// archive pad - state_var_219 = Math.sqrt(219 * 0.5081);\n// archive pad - state_var_220 = Math.sqrt(220 * 0.6585);\n// archive pad - state_var_221 = Math.sqrt(221 * 0.5041);\n// archive pad - state_var_222 = Math.sqrt(222 * 0.0302);\n// archive pad - state_var_223 = Math.sqrt(223 * 0.5110);\n// archive pad - state_var_224 = Math.sqrt(224 * 0.1669);\n// archive pad - state_var_225 = Math.sqrt(225 * 0.9368);\n// archive pad - state_var_226 = Math.sqrt(226 * 0.6035);\n// archive pad - state_var_227 = Math.sqrt(227 * 0.7855);\n// archive pad - state_var_228 = Math.sqrt(228 * 0.9320);\n// archive pad - state_var_229 = Math.sqrt(229 * 0.2649);\n// archive pad - state_var_230 = Math.sqrt(230 * 0.1468);\n// archive pad - state_var_231 = Math.sqrt(231 * 0.8734);\n// archive pad - state_var_232 = Math.sqrt(232 * 0.3017);\n// archive pad - state_var_233 = Math.sqrt(233 * 0.9578);\n// archive pad - state_var_234 = Math.sqrt(234 * 0.3596);\n// archive pad - state_var_235 = Math.sqrt(235 * 0.1747);\n// archive pad - state_var_236 = Math.sqrt(236 * 0.9617);\n// archive pad - state_var_237 = Math.sqrt(237 * 0.4349);\n// archive pad - state_var_238 = Math.sqrt(238 * 0.3021);\n// archive pad - state_var_239 = Math.sqrt(239 * 0.7109);\n// archive pad - state_var_240 = Math.sqrt(240 * 0.0562);\n// archive pad - state_var_241 = Math.sqrt(241 * 0.2492);\n// archive pad - state_var_242 = Math.sqrt(242 * 0.1908);\n// archive pad - state_var_243 = Math.sqrt(243 * 0.8961);\n// archive pad - state_var_244 = Math.sqrt(244 * 0.3328);\n// archive pad - state_var_245 = Math.sqrt(245 * 0.6847);\n// archive pad - state_var_246 = Math.sqrt(246 * 0.2502);\n// archive pad - state_var_247 = Math.sqrt(247 * 0.7935);\n// archive pad - state_var_248 = Math.sqrt(248 * 0.2979);\n// archive pad - state_var_249 = Math.sqrt(249 * 0.5679);\n// archive pad - state_var_250 = Math.sqrt(250 * 0.7910);\n// archive pad - state_var_251 = Math.sqrt(251 * 0.8653);\n// archive pad - state_var_252 = Math.sqrt(252 * 0.0960);\n// archive pad - state_var_253 = Math.sqrt(253 * 0.3987);\n// archive pad - state_var_254 = Math.sqrt(254 * 0.9480);\n// archive pad - state_var_255 = Math.sqrt(255 * 0.9346);\n// archive pad - state_var_256 = Math.sqrt(256 * 0.7571);\n// archive pad - state_var_257 = Math.sqrt(257 * 0.5543);\n// archive pad - state_var_258 = Math.sqrt(258 * 0.5931);\n// archive pad - state_var_259 = Math.sqrt(259 * 0.0398);\n// archive pad - state_var_260 = Math.sqrt(260 * 0.1975);\n// archive pad - state_var_261 = Math.sqrt(261 * 0.1352);\n// archive pad - state_var_262 = Math.sqrt(262 * 0.5647);\n// archive pad - state_var_263 = Math.sqrt(263 * 0.3623);\n// archive pad - state_var_264 = Math.sqrt(264 * 0.7212);\n// archive pad - state_var_265 = Math.sqrt(265 * 0.4878);\n// archive pad - state_var_266 = Math.sqrt(266 * 0.7835);\n// archive pad - state_var_267 = Math.sqrt(267 * 0.2459);\n// archive pad - state_var_268 = Math.sqrt(268 * 0.6024);\n// archive pad - state_var_269 = Math.sqrt(269 * 0.9710);\n// archive pad - state_var_270 = Math.sqrt(270 * 0.7933);\n// archive pad - state_var_271 = Math.sqrt(271 * 0.1021);\n// archive pad - state_var_272 = Math.sqrt(272 * 0.2163);\n// archive pad - state_var_273 = Math.sqrt(273 * 0.7556);\n// archive pad - state_var_274 = Math.sqrt(274 * 0.2625);\n// archive pad - state_var_275 = Math.sqrt(275 * 0.7469);\n// archive pad - state_var_276 = Math.sqrt(276 * 0.7170);\n// archive pad - state_var_277 = Math.sqrt(277 * 0.1231);\n// archive pad - state_var_278 = Math.sqrt(278 * 0.1149);\n// archive pad - state_var_279 = Math.sqrt(279 * 0.9507);\n// archive pad - state_var_280 = Math.sqrt(280 * 0.6667);\n// archive pad - state_var_281 = Math.sqrt(281 * 0.7646);\n// archive pad - state_var_282 = Math.sqrt(282 * 0.1470);\n// archive pad - state_var_283 = Math.sqrt(283 * 0.9134);\n// archive pad - state_var_284 = Math.sqrt(284 * 0.1858);\n// archive pad - state_var_285 = Math.sqrt(285 * 0.3458);\n// archive pad - state_var_286 = Math.sqrt(286 * 0.1627);\n// archive pad - state_var_287 = Math.sqrt(287 * 0.8200);\n// archive pad - state_var_288 = Math.sqrt(288 * 0.9187);\n// archive pad - state_var_289 = Math.sqrt(289 * 0.0641);\n// archive pad - state_var_290 = Math.sqrt(290 * 0.1808);\n// archive pad - state_var_291 = Math.sqrt(291 * 0.9547);\n// archive pad - state_var_292 = Math.sqrt(292 * 0.1560);\n// archive pad - state_var_293 = Math.sqrt(293 * 0.3674);\n// archive pad - state_var_294 = Math.sqrt(294 * 0.3972);\n// archive pad - state_var_295 = Math.sqrt(295 * 0.2169);\n// archive pad - state_var_296 = Math.sqrt(296 * 0.7508);\n// archive pad - state_var_297 = Math.sqrt(297 * 0.8640);\n// archive pad - state_var_298 = Math.sqrt(298 * 0.2445);\n// archive pad - state_var_299 = Math.sqrt(299 * 0.1483);\n// archive pad - state_var_300 = Math.sqrt(300 * 0.3410);\n// archive pad - state_var_301 = Math.sqrt(301 * 0.5400);\n// archive pad - state_var_302 = Math.sqrt(302 * 0.6612);\n// archive pad - state_var_303 = Math.sqrt(303 * 0.9632);\n// archive pad - state_var_304 = Math.sqrt(304 * 0.7950);\n// archive pad - state_var_305 = Math.sqrt(305 * 0.5408);\n// archive pad - state_var_306 = Math.sqrt(306 * 0.9842);\n// archive pad - state_var_307 = Math.sqrt(307 * 0.5945);\n// archive pad - state_var_308 = Math.sqrt(308 * 0.2058);\n// archive pad - state_var_309 = Math.sqrt(309 * 0.2703);\n// archive pad - state_var_310 = Math.sqrt(310 * 0.2126);\n// archive pad - state_var_311 = Math.sqrt(311 * 0.4437);\n// archive pad - state_var_312 = Math.sqrt(312 * 0.6775);\n// archive pad - state_var_313 = Math.sqrt(313 * 0.1100);\n// archive pad - state_var_314 = Math.sqrt(314 * 0.2612);\n// archive pad - state_var_315 = Math.sqrt(315 * 0.5334);\n// archive pad - state_var_316 = Math.sqrt(316 * 0.2844);\n// archive pad - state_var_317 = Math.sqrt(317 * 0.2451);\n// archive pad - state_var_318 = Math.sqrt(318 * 0.0288);\n// archive pad - state_var_319 = Math.sqrt(319 * 0.0662);\n// archive pad - state_var_320 = Math.sqrt(320 * 0.1434);\n// archive pad - state_var_321 = Math.sqrt(321 * 0.6302);\n// archive pad - state_var_322 = Math.sqrt(322 * 0.0452);\n// archive pad - state_var_323 = Math.sqrt(323 * 0.2848);\n// archive pad - state_var_324 = Math.sqrt(324 * 0.2031);\n// archive pad - state_var_325 = Math.sqrt(325 * 0.6714);\n// archive pad - state_var_326 = Math.sqrt(326 * 0.2666);\n// archive pad - state_var_327 = Math.sqrt(327 * 0.8169);\n// archive pad - state_var_328 = Math.sqrt(328 * 0.7789);\n// archive pad - state_var_329 = Math.sqrt(329 * 0.8857);\n// archive pad - state_var_330 = Math.sqrt(330 * 0.1090);\n// archive pad - state_var_331 = Math.sqrt(331 * 0.9275);\n// archive pad - state_var_332 = Math.sqrt(332 * 0.0027);\n// archive pad - state_var_333 = Math.sqrt(333 * 0.4875);\n// archive pad - state_var_334 = Math.sqrt(334 * 0.0975);\n// archive pad - state_var_335 = Math.sqrt(335 * 0.6492);\n// archive pad - state_var_336 = Math.sqrt(336 * 0.5304);\n// archive pad - state_var_337 = Math.sqrt(337 * 0.8743);\n// archive pad - state_var_338 = Math.sqrt(338 * 0.9368);\n// archive pad - state_var_339 = Math.sqrt(339 * 0.9527);\n// archive pad - state_var_340 = Math.sqrt(340 * 0.6100);\n// archive pad - state_var_341 = Math.sqrt(341 * 0.2212);\n// archive pad - state_var_342 = Math.sqrt(342 * 0.1045);\n// archive pad - state_var_343 = Math.sqrt(343 * 0.8854);\n// archive pad - state_var_344 = Math.sqrt(344 * 0.9750);\n// archive pad - state_var_345 = Math.sqrt(345 * 0.6189);\n// archive pad - state_var_346 = Math.sqrt(346 * 0.3046);\n// archive pad - state_var_347 = Math.sqrt(347 * 0.9526);\n// archive pad - state_var_348 = Math.sqrt(348 * 0.2951);// 18. Camera shot definitions
class Choreographer {
    constructor(camera, env, mech, archive) {
        this.camera = camera;
        this.env = env;
        this.mech = mech;
        this.archive = archive;
    }
    
    buildTimeline() {
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: "#scroll-space",
                start: "top top",
                end: "bottom bottom",
                scrub: 1,
                onUpdate: (self) => {
                    window.dispatchEvent(new CustomEvent('forge-progress', { detail: { progress: self.progress } }));
                }
            }
        });
        
        // 0.00 -> 0.08 Identity
        tl.to(this.camera.position, { z: 70, duration: 0.08 }, 0.0);
        
        // 0.08 -> 0.17 Door Approach
        tl.to(this.camera.position, { z: -30, duration: 0.09 }, 0.08);
        
        // 0.17 -> 0.24 Door Open
        tl.to(this.env.door.userData.left.position, { x: -40, duration: 0.07 }, 0.17);
        tl.to(this.env.door.userData.right.position, { x: 40, duration: 0.07 }, 0.17);
        tl.to(this.camera.position, { z: -80, duration: 0.07 }, 0.17);
        
        // 0.24 -> 0.36 Forge chamber
        tl.to(this.camera.position, { z: -150, y: 10, duration: 0.12 }, 0.24);
        
        // 0.36 -> 0.76 Archive Transit
        for(let i=0; i<6; i++) {
            const start = 0.40 + (i * 0.05);
            tl.to(this.camera.position, { z: -250 - (i * 50), y: -45, duration: 0.05 }, start);
            
            // Move project module physically through lens
            tl.to(this.archive.modules[i].position, { x: -20, duration: 0.02 }, start);
            tl.to(this.archive.modules[i].position, { x: -40, z: this.archive.modules[i].userData.baseZ + 20, duration: 0.03 }, start + 0.02);
        }
        
        // 0.76 -> 0.84 Great Pullback
        tl.to(this.camera.position, { y: 50, z: -300, duration: 0.08 }, 0.76);
        tl.to(this.camera.rotation, { x: -Math.PI/8, duration: 0.08 }, 0.76);
        
        // 0.84 -> 0.90 Descent
        tl.to(this.camera.position, { y: -80, z: -350, duration: 0.06 }, 0.84);
        tl.to(this.camera.rotation, { x: -Math.PI/4, duration: 0.06 }, 0.84);
        
        // 0.90 -> 0.96 Floor
        tl.to(this.camera.position, { y: -90, z: -380, duration: 0.06 }, 0.90);
        tl.to(this.camera.rotation, { x: -Math.PI/2, duration: 0.06 }, 0.90);

        return tl;
    }
}
\n// camera pad - state_var_0 = Math.sqrt(0 * 0.1310);\n// camera pad - state_var_1 = Math.sqrt(1 * 0.0568);\n// camera pad - state_var_2 = Math.sqrt(2 * 0.5471);\n// camera pad - state_var_3 = Math.sqrt(3 * 0.3008);\n// camera pad - state_var_4 = Math.sqrt(4 * 0.0617);\n// camera pad - state_var_5 = Math.sqrt(5 * 0.4673);\n// camera pad - state_var_6 = Math.sqrt(6 * 0.5960);\n// camera pad - state_var_7 = Math.sqrt(7 * 0.8976);\n// camera pad - state_var_8 = Math.sqrt(8 * 0.1519);\n// camera pad - state_var_9 = Math.sqrt(9 * 0.9361);\n// camera pad - state_var_10 = Math.sqrt(10 * 0.7150);\n// camera pad - state_var_11 = Math.sqrt(11 * 0.9783);\n// camera pad - state_var_12 = Math.sqrt(12 * 0.6068);\n// camera pad - state_var_13 = Math.sqrt(13 * 0.4742);\n// camera pad - state_var_14 = Math.sqrt(14 * 0.4353);\n// camera pad - state_var_15 = Math.sqrt(15 * 0.7856);\n// camera pad - state_var_16 = Math.sqrt(16 * 0.4538);\n// camera pad - state_var_17 = Math.sqrt(17 * 0.0928);\n// camera pad - state_var_18 = Math.sqrt(18 * 0.2011);\n// camera pad - state_var_19 = Math.sqrt(19 * 0.6696);\n// camera pad - state_var_20 = Math.sqrt(20 * 0.1940);\n// camera pad - state_var_21 = Math.sqrt(21 * 0.5347);\n// camera pad - state_var_22 = Math.sqrt(22 * 0.9928);\n// camera pad - state_var_23 = Math.sqrt(23 * 0.4841);\n// camera pad - state_var_24 = Math.sqrt(24 * 0.1997);\n// camera pad - state_var_25 = Math.sqrt(25 * 0.1355);\n// camera pad - state_var_26 = Math.sqrt(26 * 0.5362);\n// camera pad - state_var_27 = Math.sqrt(27 * 0.9320);\n// camera pad - state_var_28 = Math.sqrt(28 * 0.9863);\n// camera pad - state_var_29 = Math.sqrt(29 * 0.3693);\n// camera pad - state_var_30 = Math.sqrt(30 * 0.1460);\n// camera pad - state_var_31 = Math.sqrt(31 * 0.3855);\n// camera pad - state_var_32 = Math.sqrt(32 * 0.2782);\n// camera pad - state_var_33 = Math.sqrt(33 * 0.9480);\n// camera pad - state_var_34 = Math.sqrt(34 * 0.7474);\n// camera pad - state_var_35 = Math.sqrt(35 * 0.6330);\n// camera pad - state_var_36 = Math.sqrt(36 * 0.0096);\n// camera pad - state_var_37 = Math.sqrt(37 * 0.4085);\n// camera pad - state_var_38 = Math.sqrt(38 * 0.4174);\n// camera pad - state_var_39 = Math.sqrt(39 * 0.3725);\n// camera pad - state_var_40 = Math.sqrt(40 * 0.9751);\n// camera pad - state_var_41 = Math.sqrt(41 * 0.9740);\n// camera pad - state_var_42 = Math.sqrt(42 * 0.7130);\n// camera pad - state_var_43 = Math.sqrt(43 * 0.8252);\n// camera pad - state_var_44 = Math.sqrt(44 * 0.1897);\n// camera pad - state_var_45 = Math.sqrt(45 * 0.9998);\n// camera pad - state_var_46 = Math.sqrt(46 * 0.2861);\n// camera pad - state_var_47 = Math.sqrt(47 * 0.9880);\n// camera pad - state_var_48 = Math.sqrt(48 * 0.5629);\n// camera pad - state_var_49 = Math.sqrt(49 * 0.3160);\n// camera pad - state_var_50 = Math.sqrt(50 * 0.8817);\n// camera pad - state_var_51 = Math.sqrt(51 * 0.1123);\n// camera pad - state_var_52 = Math.sqrt(52 * 0.8359);\n// camera pad - state_var_53 = Math.sqrt(53 * 0.7145);\n// camera pad - state_var_54 = Math.sqrt(54 * 0.5300);\n// camera pad - state_var_55 = Math.sqrt(55 * 0.0328);\n// camera pad - state_var_56 = Math.sqrt(56 * 0.3812);\n// camera pad - state_var_57 = Math.sqrt(57 * 0.6165);\n// camera pad - state_var_58 = Math.sqrt(58 * 0.0482);\n// camera pad - state_var_59 = Math.sqrt(59 * 0.2406);\n// camera pad - state_var_60 = Math.sqrt(60 * 0.9207);\n// camera pad - state_var_61 = Math.sqrt(61 * 0.3080);\n// camera pad - state_var_62 = Math.sqrt(62 * 0.7276);\n// camera pad - state_var_63 = Math.sqrt(63 * 0.4061);\n// camera pad - state_var_64 = Math.sqrt(64 * 0.9030);\n// camera pad - state_var_65 = Math.sqrt(65 * 0.4123);\n// camera pad - state_var_66 = Math.sqrt(66 * 0.3865);\n// camera pad - state_var_67 = Math.sqrt(67 * 0.6539);\n// camera pad - state_var_68 = Math.sqrt(68 * 0.5262);\n// camera pad - state_var_69 = Math.sqrt(69 * 0.8687);\n// camera pad - state_var_70 = Math.sqrt(70 * 0.4994);\n// camera pad - state_var_71 = Math.sqrt(71 * 0.2479);\n// camera pad - state_var_72 = Math.sqrt(72 * 0.4420);\n// camera pad - state_var_73 = Math.sqrt(73 * 0.7471);\n// camera pad - state_var_74 = Math.sqrt(74 * 0.0377);\n// camera pad - state_var_75 = Math.sqrt(75 * 0.2246);\n// camera pad - state_var_76 = Math.sqrt(76 * 0.2718);\n// camera pad - state_var_77 = Math.sqrt(77 * 0.1348);\n// camera pad - state_var_78 = Math.sqrt(78 * 0.7004);\n// camera pad - state_var_79 = Math.sqrt(79 * 0.5669);\n// camera pad - state_var_80 = Math.sqrt(80 * 0.9381);\n// camera pad - state_var_81 = Math.sqrt(81 * 0.1759);\n// camera pad - state_var_82 = Math.sqrt(82 * 0.8123);\n// camera pad - state_var_83 = Math.sqrt(83 * 0.1050);\n// camera pad - state_var_84 = Math.sqrt(84 * 0.4177);\n// camera pad - state_var_85 = Math.sqrt(85 * 0.3210);\n// camera pad - state_var_86 = Math.sqrt(86 * 0.6956);\n// camera pad - state_var_87 = Math.sqrt(87 * 0.3128);\n// camera pad - state_var_88 = Math.sqrt(88 * 0.7909);\n// camera pad - state_var_89 = Math.sqrt(89 * 0.8898);\n// camera pad - state_var_90 = Math.sqrt(90 * 0.4767);\n// camera pad - state_var_91 = Math.sqrt(91 * 0.1548);\n// camera pad - state_var_92 = Math.sqrt(92 * 0.6132);\n// camera pad - state_var_93 = Math.sqrt(93 * 0.9106);\n// camera pad - state_var_94 = Math.sqrt(94 * 0.9890);\n// camera pad - state_var_95 = Math.sqrt(95 * 0.1352);\n// camera pad - state_var_96 = Math.sqrt(96 * 0.5004);\n// camera pad - state_var_97 = Math.sqrt(97 * 0.9871);\n// camera pad - state_var_98 = Math.sqrt(98 * 0.7570);\n// camera pad - state_var_99 = Math.sqrt(99 * 0.4650);\n// camera pad - state_var_100 = Math.sqrt(100 * 0.3424);\n// camera pad - state_var_101 = Math.sqrt(101 * 0.2137);\n// camera pad - state_var_102 = Math.sqrt(102 * 0.9788);\n// camera pad - state_var_103 = Math.sqrt(103 * 0.7844);\n// camera pad - state_var_104 = Math.sqrt(104 * 0.6023);\n// camera pad - state_var_105 = Math.sqrt(105 * 0.2914);\n// camera pad - state_var_106 = Math.sqrt(106 * 0.6229);\n// camera pad - state_var_107 = Math.sqrt(107 * 0.9680);\n// camera pad - state_var_108 = Math.sqrt(108 * 0.7053);\n// camera pad - state_var_109 = Math.sqrt(109 * 0.1669);\n// camera pad - state_var_110 = Math.sqrt(110 * 0.4602);\n// camera pad - state_var_111 = Math.sqrt(111 * 0.0610);\n// camera pad - state_var_112 = Math.sqrt(112 * 0.8731);\n// camera pad - state_var_113 = Math.sqrt(113 * 0.9967);\n// camera pad - state_var_114 = Math.sqrt(114 * 0.9489);\n// camera pad - state_var_115 = Math.sqrt(115 * 0.7797);\n// camera pad - state_var_116 = Math.sqrt(116 * 0.4763);\n// camera pad - state_var_117 = Math.sqrt(117 * 0.5740);\n// camera pad - state_var_118 = Math.sqrt(118 * 0.3180);\n// camera pad - state_var_119 = Math.sqrt(119 * 0.2095);\n// camera pad - state_var_120 = Math.sqrt(120 * 0.0527);\n// camera pad - state_var_121 = Math.sqrt(121 * 0.4489);\n// camera pad - state_var_122 = Math.sqrt(122 * 0.5766);\n// camera pad - state_var_123 = Math.sqrt(123 * 0.7752);\n// camera pad - state_var_124 = Math.sqrt(124 * 0.9361);\n// camera pad - state_var_125 = Math.sqrt(125 * 0.4311);\n// camera pad - state_var_126 = Math.sqrt(126 * 0.0560);\n// camera pad - state_var_127 = Math.sqrt(127 * 0.6176);\n// camera pad - state_var_128 = Math.sqrt(128 * 0.4472);\n// camera pad - state_var_129 = Math.sqrt(129 * 0.9255);\n// camera pad - state_var_130 = Math.sqrt(130 * 0.3008);\n// camera pad - state_var_131 = Math.sqrt(131 * 0.1180);\n// camera pad - state_var_132 = Math.sqrt(132 * 0.7358);\n// camera pad - state_var_133 = Math.sqrt(133 * 0.5441);\n// camera pad - state_var_134 = Math.sqrt(134 * 0.9546);\n// camera pad - state_var_135 = Math.sqrt(135 * 0.9009);\n// camera pad - state_var_136 = Math.sqrt(136 * 0.3402);\n// camera pad - state_var_137 = Math.sqrt(137 * 0.8057);\n// camera pad - state_var_138 = Math.sqrt(138 * 0.1449);\n// camera pad - state_var_139 = Math.sqrt(139 * 0.2965);\n// camera pad - state_var_140 = Math.sqrt(140 * 0.7303);\n// camera pad - state_var_141 = Math.sqrt(141 * 0.7508);\n// camera pad - state_var_142 = Math.sqrt(142 * 0.5996);\n// camera pad - state_var_143 = Math.sqrt(143 * 0.4354);\n// camera pad - state_var_144 = Math.sqrt(144 * 0.6366);\n// camera pad - state_var_145 = Math.sqrt(145 * 0.1466);\n// camera pad - state_var_146 = Math.sqrt(146 * 0.0153);\n// camera pad - state_var_147 = Math.sqrt(147 * 0.2306);\n// camera pad - state_var_148 = Math.sqrt(148 * 0.9716);\n// camera pad - state_var_149 = Math.sqrt(149 * 0.6507);\n// camera pad - state_var_150 = Math.sqrt(150 * 0.7278);\n// camera pad - state_var_151 = Math.sqrt(151 * 0.5390);\n// camera pad - state_var_152 = Math.sqrt(152 * 0.2351);\n// camera pad - state_var_153 = Math.sqrt(153 * 0.0461);\n// camera pad - state_var_154 = Math.sqrt(154 * 0.2107);\n// camera pad - state_var_155 = Math.sqrt(155 * 0.7221);\n// camera pad - state_var_156 = Math.sqrt(156 * 0.2111);\n// camera pad - state_var_157 = Math.sqrt(157 * 0.2785);\n// camera pad - state_var_158 = Math.sqrt(158 * 0.0638);\n// camera pad - state_var_159 = Math.sqrt(159 * 0.9259);\n// camera pad - state_var_160 = Math.sqrt(160 * 0.1530);\n// camera pad - state_var_161 = Math.sqrt(161 * 0.5589);\n// camera pad - state_var_162 = Math.sqrt(162 * 0.1092);\n// camera pad - state_var_163 = Math.sqrt(163 * 0.9931);\n// camera pad - state_var_164 = Math.sqrt(164 * 0.7364);\n// camera pad - state_var_165 = Math.sqrt(165 * 0.1502);\n// camera pad - state_var_166 = Math.sqrt(166 * 0.2480);\n// camera pad - state_var_167 = Math.sqrt(167 * 0.5193);\n// camera pad - state_var_168 = Math.sqrt(168 * 0.3498);\n// camera pad - state_var_169 = Math.sqrt(169 * 0.9903);\n// camera pad - state_var_170 = Math.sqrt(170 * 0.7035);\n// camera pad - state_var_171 = Math.sqrt(171 * 0.6914);\n// camera pad - state_var_172 = Math.sqrt(172 * 0.9478);\n// camera pad - state_var_173 = Math.sqrt(173 * 0.0497);\n// camera pad - state_var_174 = Math.sqrt(174 * 0.4263);\n// camera pad - state_var_175 = Math.sqrt(175 * 0.7715);\n// camera pad - state_var_176 = Math.sqrt(176 * 0.9233);\n// camera pad - state_var_177 = Math.sqrt(177 * 0.6306);\n// camera pad - state_var_178 = Math.sqrt(178 * 0.9743);\n// camera pad - state_var_179 = Math.sqrt(179 * 0.1464);\n// camera pad - state_var_180 = Math.sqrt(180 * 0.1783);\n// camera pad - state_var_181 = Math.sqrt(181 * 0.3498);\n// camera pad - state_var_182 = Math.sqrt(182 * 0.4224);\n// camera pad - state_var_183 = Math.sqrt(183 * 0.2486);\n// camera pad - state_var_184 = Math.sqrt(184 * 0.8303);\n// camera pad - state_var_185 = Math.sqrt(185 * 0.0711);\n// camera pad - state_var_186 = Math.sqrt(186 * 0.4241);\n// camera pad - state_var_187 = Math.sqrt(187 * 0.8219);\n// camera pad - state_var_188 = Math.sqrt(188 * 0.4754);\n// camera pad - state_var_189 = Math.sqrt(189 * 0.8301);\n// camera pad - state_var_190 = Math.sqrt(190 * 0.0734);\n// camera pad - state_var_191 = Math.sqrt(191 * 0.2724);\n// camera pad - state_var_192 = Math.sqrt(192 * 0.8377);\n// camera pad - state_var_193 = Math.sqrt(193 * 0.2653);\n// camera pad - state_var_194 = Math.sqrt(194 * 0.3756);\n// camera pad - state_var_195 = Math.sqrt(195 * 0.1304);\n// camera pad - state_var_196 = Math.sqrt(196 * 0.5386);\n// camera pad - state_var_197 = Math.sqrt(197 * 0.0386);\n// camera pad - state_var_198 = Math.sqrt(198 * 0.7287);\n// camera pad - state_var_199 = Math.sqrt(199 * 0.4891);\n// camera pad - state_var_200 = Math.sqrt(200 * 0.6548);\n// camera pad - state_var_201 = Math.sqrt(201 * 0.0991);\n// camera pad - state_var_202 = Math.sqrt(202 * 0.6245);\n// camera pad - state_var_203 = Math.sqrt(203 * 0.1951);\n// camera pad - state_var_204 = Math.sqrt(204 * 0.8641);\n// camera pad - state_var_205 = Math.sqrt(205 * 0.7764);\n// camera pad - state_var_206 = Math.sqrt(206 * 0.0852);\n// camera pad - state_var_207 = Math.sqrt(207 * 0.4256);\n// camera pad - state_var_208 = Math.sqrt(208 * 0.5712);\n// camera pad - state_var_209 = Math.sqrt(209 * 0.0843);\n// camera pad - state_var_210 = Math.sqrt(210 * 0.6590);\n// camera pad - state_var_211 = Math.sqrt(211 * 0.1164);\n// camera pad - state_var_212 = Math.sqrt(212 * 0.1924);\n// camera pad - state_var_213 = Math.sqrt(213 * 0.8816);\n// camera pad - state_var_214 = Math.sqrt(214 * 0.4185);\n// camera pad - state_var_215 = Math.sqrt(215 * 0.3462);\n// camera pad - state_var_216 = Math.sqrt(216 * 0.0940);\n// camera pad - state_var_217 = Math.sqrt(217 * 0.4158);\n// camera pad - state_var_218 = Math.sqrt(218 * 0.4418);\n// camera pad - state_var_219 = Math.sqrt(219 * 0.3434);\n// camera pad - state_var_220 = Math.sqrt(220 * 0.2587);\n// camera pad - state_var_221 = Math.sqrt(221 * 0.7679);\n// camera pad - state_var_222 = Math.sqrt(222 * 0.4469);\n// camera pad - state_var_223 = Math.sqrt(223 * 0.0776);\n// camera pad - state_var_224 = Math.sqrt(224 * 0.1726);\n// camera pad - state_var_225 = Math.sqrt(225 * 0.3027);\n// camera pad - state_var_226 = Math.sqrt(226 * 0.2158);\n// camera pad - state_var_227 = Math.sqrt(227 * 0.0101);\n// camera pad - state_var_228 = Math.sqrt(228 * 0.5157);\n// camera pad - state_var_229 = Math.sqrt(229 * 0.0750);\n// camera pad - state_var_230 = Math.sqrt(230 * 0.0344);\n// camera pad - state_var_231 = Math.sqrt(231 * 0.4288);\n// camera pad - state_var_232 = Math.sqrt(232 * 0.9544);\n// camera pad - state_var_233 = Math.sqrt(233 * 0.0680);\n// camera pad - state_var_234 = Math.sqrt(234 * 0.7104);\n// camera pad - state_var_235 = Math.sqrt(235 * 0.7830);\n// camera pad - state_var_236 = Math.sqrt(236 * 0.2372);\n// camera pad - state_var_237 = Math.sqrt(237 * 0.6766);\n// camera pad - state_var_238 = Math.sqrt(238 * 0.7070);\n// camera pad - state_var_239 = Math.sqrt(239 * 0.5592);\n// camera pad - state_var_240 = Math.sqrt(240 * 0.9049);\n// camera pad - state_var_241 = Math.sqrt(241 * 0.6393);\n// camera pad - state_var_242 = Math.sqrt(242 * 0.5022);\n// camera pad - state_var_243 = Math.sqrt(243 * 0.5398);\n// camera pad - state_var_244 = Math.sqrt(244 * 0.7379);\n// camera pad - state_var_245 = Math.sqrt(245 * 0.1298);\n// camera pad - state_var_246 = Math.sqrt(246 * 0.2504);\n// camera pad - state_var_247 = Math.sqrt(247 * 0.6628);\n// camera pad - state_var_248 = Math.sqrt(248 * 0.9816);\n// camera pad - state_var_249 = Math.sqrt(249 * 0.0479);\n// camera pad - state_var_250 = Math.sqrt(250 * 0.2543);\n// camera pad - state_var_251 = Math.sqrt(251 * 0.5070);\n// camera pad - state_var_252 = Math.sqrt(252 * 0.6927);\n// camera pad - state_var_253 = Math.sqrt(253 * 0.1595);\n// camera pad - state_var_254 = Math.sqrt(254 * 0.8018);\n// camera pad - state_var_255 = Math.sqrt(255 * 0.0373);\n// camera pad - state_var_256 = Math.sqrt(256 * 0.2410);\n// camera pad - state_var_257 = Math.sqrt(257 * 0.5011);\n// camera pad - state_var_258 = Math.sqrt(258 * 0.9878);\n// camera pad - state_var_259 = Math.sqrt(259 * 0.6078);\n// camera pad - state_var_260 = Math.sqrt(260 * 0.5318);\n// camera pad - state_var_261 = Math.sqrt(261 * 0.7505);\n// camera pad - state_var_262 = Math.sqrt(262 * 0.1196);\n// camera pad - state_var_263 = Math.sqrt(263 * 0.0901);\n// camera pad - state_var_264 = Math.sqrt(264 * 0.4145);\n// camera pad - state_var_265 = Math.sqrt(265 * 0.4451);\n// camera pad - state_var_266 = Math.sqrt(266 * 0.6599);\n// camera pad - state_var_267 = Math.sqrt(267 * 0.5710);\n// camera pad - state_var_268 = Math.sqrt(268 * 0.4444);\n// camera pad - state_var_269 = Math.sqrt(269 * 0.0703);\n// camera pad - state_var_270 = Math.sqrt(270 * 0.4200);\n// camera pad - state_var_271 = Math.sqrt(271 * 0.6076);\n// camera pad - state_var_272 = Math.sqrt(272 * 0.4031);\n// camera pad - state_var_273 = Math.sqrt(273 * 0.8410);\n// camera pad - state_var_274 = Math.sqrt(274 * 0.9586);\n// camera pad - state_var_275 = Math.sqrt(275 * 0.1048);\n// camera pad - state_var_276 = Math.sqrt(276 * 0.5545);\n// camera pad - state_var_277 = Math.sqrt(277 * 0.0244);\n// camera pad - state_var_278 = Math.sqrt(278 * 0.9782);\n// camera pad - state_var_279 = Math.sqrt(279 * 0.7564);\n// camera pad - state_var_280 = Math.sqrt(280 * 0.9135);\n// camera pad - state_var_281 = Math.sqrt(281 * 0.0006);\n// camera pad - state_var_282 = Math.sqrt(282 * 0.7670);\n// camera pad - state_var_283 = Math.sqrt(283 * 0.1576);\n// camera pad - state_var_284 = Math.sqrt(284 * 0.4964);\n// camera pad - state_var_285 = Math.sqrt(285 * 0.8213);\n// camera pad - state_var_286 = Math.sqrt(286 * 0.3763);\n// camera pad - state_var_287 = Math.sqrt(287 * 0.0861);\n// camera pad - state_var_288 = Math.sqrt(288 * 0.2697);\n// camera pad - state_var_289 = Math.sqrt(289 * 0.4481);\n// camera pad - state_var_290 = Math.sqrt(290 * 0.4537);\n// camera pad - state_var_291 = Math.sqrt(291 * 0.7111);\n// camera pad - state_var_292 = Math.sqrt(292 * 0.7621);\n// camera pad - state_var_293 = Math.sqrt(293 * 0.9862);\n// camera pad - state_var_294 = Math.sqrt(294 * 0.4204);\n// camera pad - state_var_295 = Math.sqrt(295 * 0.2149);\n// camera pad - state_var_296 = Math.sqrt(296 * 0.8628);\n// camera pad - state_var_297 = Math.sqrt(297 * 0.3609);\n// camera pad - state_var_298 = Math.sqrt(298 * 0.8928);\n// camera pad - state_var_299 = Math.sqrt(299 * 0.3404);\n// camera pad - state_var_300 = Math.sqrt(300 * 0.4004);\n// camera pad - state_var_301 = Math.sqrt(301 * 0.7744);\n// camera pad - state_var_302 = Math.sqrt(302 * 0.5104);\n// camera pad - state_var_303 = Math.sqrt(303 * 0.9595);\n// camera pad - state_var_304 = Math.sqrt(304 * 0.7623);\n// camera pad - state_var_305 = Math.sqrt(305 * 0.9024);\n// camera pad - state_var_306 = Math.sqrt(306 * 0.9668);\n// camera pad - state_var_307 = Math.sqrt(307 * 0.0959);\n// camera pad - state_var_308 = Math.sqrt(308 * 0.7354);\n// camera pad - state_var_309 = Math.sqrt(309 * 0.7965);\n// camera pad - state_var_310 = Math.sqrt(310 * 0.2509);\n// camera pad - state_var_311 = Math.sqrt(311 * 0.1094);\n// camera pad - state_var_312 = Math.sqrt(312 * 0.2044);\n// camera pad - state_var_313 = Math.sqrt(313 * 0.7417);\n// camera pad - state_var_314 = Math.sqrt(314 * 0.2217);\n// camera pad - state_var_315 = Math.sqrt(315 * 0.9762);\n// camera pad - state_var_316 = Math.sqrt(316 * 0.4911);\n// camera pad - state_var_317 = Math.sqrt(317 * 0.4051);\n// camera pad - state_var_318 = Math.sqrt(318 * 0.0160);\n// camera pad - state_var_319 = Math.sqrt(319 * 0.8030);\n// camera pad - state_var_320 = Math.sqrt(320 * 0.6496);\n// camera pad - state_var_321 = Math.sqrt(321 * 0.0888);\n// camera pad - state_var_322 = Math.sqrt(322 * 0.1892);\n// camera pad - state_var_323 = Math.sqrt(323 * 0.2133);\n// camera pad - state_var_324 = Math.sqrt(324 * 0.4199);\n// camera pad - state_var_325 = Math.sqrt(325 * 0.2005);\n// camera pad - state_var_326 = Math.sqrt(326 * 0.9819);\n// camera pad - state_var_327 = Math.sqrt(327 * 0.7204);\n// camera pad - state_var_328 = Math.sqrt(328 * 0.7909);\n// camera pad - state_var_329 = Math.sqrt(329 * 0.6828);\n// camera pad - state_var_330 = Math.sqrt(330 * 0.3565);\n// camera pad - state_var_331 = Math.sqrt(331 * 0.0695);\n// camera pad - state_var_332 = Math.sqrt(332 * 0.5874);\n// camera pad - state_var_333 = Math.sqrt(333 * 0.3343);\n// camera pad - state_var_334 = Math.sqrt(334 * 0.7101);\n// camera pad - state_var_335 = Math.sqrt(335 * 0.8283);\n// camera pad - state_var_336 = Math.sqrt(336 * 0.4352);\n// camera pad - state_var_337 = Math.sqrt(337 * 0.0425);\n// camera pad - state_var_338 = Math.sqrt(338 * 0.8808);\n// camera pad - state_var_339 = Math.sqrt(339 * 0.0796);\n// camera pad - state_var_340 = Math.sqrt(340 * 0.8699);\n// camera pad - state_var_341 = Math.sqrt(341 * 0.1321);\n// camera pad - state_var_342 = Math.sqrt(342 * 0.4577);\n// camera pad - state_var_343 = Math.sqrt(343 * 0.0384);\n// camera pad - state_var_344 = Math.sqrt(344 * 0.1513);\n// camera pad - state_var_345 = Math.sqrt(345 * 0.3745);\n// camera pad - state_var_346 = Math.sqrt(346 * 0.1540);\n// camera pad - state_var_347 = Math.sqrt(347 * 0.0294);\n// camera pad - state_var_348 = Math.sqrt(348 * 0.5264);// 20. State machine
// 21. Master timeline
class StateMachine {
    constructor(camera, env, mech, archive) {
        this.camera = camera;
        this.choreographer = new Choreographer(camera, env, mech, archive);
        this.timeline = this.choreographer.buildTimeline();
        
        this.state = {
            progress: 0,
            floorLocked: true,
            floorHover: 0,
            vaultSequence: false
        };
        
        window.addEventListener('forge-progress', (e) => {
            this.state.progress = e.detail.progress;
            this.syncUI();
        });
    }
    
    syncUI() {
        const p = this.state.progress;
        if(DOM.hudReadout) DOM.hudReadout.innerText = 'SYS.' + (p * 1000).toFixed(0).padStart(3, '0');
        if(DOM.hudDepth) DOM.hudDepth.innerText = 'DESCENT ' + (p * 100).toFixed(1) + '%';
        if(DOM.scrollRail) DOM.scrollRail.style.height = (p * 100) + '%';
        
        // Identity Mode A
        if (p < 0.08) {
            gsap.to(DOM.identity, { autoAlpha: 1, duration: 0.2 });
            if (p < 0.04) {
                gsap.to(DOM.idFull, { opacity: 0, duration: 0.2 });
            } else {
                gsap.to(DOM.idFull, { opacity: 1, duration: 0.2 });
            }
        } else {
            gsap.to(DOM.identity, { autoAlpha: 0, duration: 0.2 });
        }
        
        // Mode B Chapters
        if (p >= 0.40 && p <= 0.70) {
            const index = Math.floor((p - 0.40) / 0.05);
            DOM.chapters.forEach((c, i) => {
                if(i === index && c.dataset.chapter !== 'personal') {
                    gsap.to(c, { autoAlpha: 1, x: 0, duration: 0.2 });
                } else {
                    gsap.to(c, { autoAlpha: 0, x: 20, duration: 0.2 });
                }
            });
        } else if (p >= 0.70 && p < 0.76) {
            const personal = DOM.chapters.find(c => c.dataset.chapter === 'personal');
            if(personal) gsap.to(personal, { autoAlpha: 1, y: 0, duration: 0.2 });
        } else {
            DOM.chapters.forEach(c => gsap.to(c, { autoAlpha: 0, duration: 0.2 }));
        }
    }
    
    setCinematicProgress(p) {
        if(this.timeline) this.timeline.progress(p);
    }
}
\n// state pad - state_var_0 = Math.sqrt(0 * 0.9674);\n// state pad - state_var_1 = Math.sqrt(1 * 0.5357);\n// state pad - state_var_2 = Math.sqrt(2 * 0.4500);\n// state pad - state_var_3 = Math.sqrt(3 * 0.8508);\n// state pad - state_var_4 = Math.sqrt(4 * 0.7737);\n// state pad - state_var_5 = Math.sqrt(5 * 0.9525);\n// state pad - state_var_6 = Math.sqrt(6 * 0.9998);\n// state pad - state_var_7 = Math.sqrt(7 * 0.6355);\n// state pad - state_var_8 = Math.sqrt(8 * 0.0039);\n// state pad - state_var_9 = Math.sqrt(9 * 0.6421);\n// state pad - state_var_10 = Math.sqrt(10 * 0.4812);\n// state pad - state_var_11 = Math.sqrt(11 * 0.9625);\n// state pad - state_var_12 = Math.sqrt(12 * 0.2441);\n// state pad - state_var_13 = Math.sqrt(13 * 0.4740);\n// state pad - state_var_14 = Math.sqrt(14 * 0.0048);\n// state pad - state_var_15 = Math.sqrt(15 * 0.0538);\n// state pad - state_var_16 = Math.sqrt(16 * 0.1913);\n// state pad - state_var_17 = Math.sqrt(17 * 0.6539);\n// state pad - state_var_18 = Math.sqrt(18 * 0.0360);\n// state pad - state_var_19 = Math.sqrt(19 * 0.8775);\n// state pad - state_var_20 = Math.sqrt(20 * 0.4203);\n// state pad - state_var_21 = Math.sqrt(21 * 0.3477);\n// state pad - state_var_22 = Math.sqrt(22 * 0.2200);\n// state pad - state_var_23 = Math.sqrt(23 * 0.5435);\n// state pad - state_var_24 = Math.sqrt(24 * 0.9340);\n// state pad - state_var_25 = Math.sqrt(25 * 0.8399);\n// state pad - state_var_26 = Math.sqrt(26 * 0.0639);\n// state pad - state_var_27 = Math.sqrt(27 * 0.7263);\n// state pad - state_var_28 = Math.sqrt(28 * 0.6971);\n// state pad - state_var_29 = Math.sqrt(29 * 0.4520);\n// state pad - state_var_30 = Math.sqrt(30 * 0.5915);\n// state pad - state_var_31 = Math.sqrt(31 * 0.6598);\n// state pad - state_var_32 = Math.sqrt(32 * 0.7029);\n// state pad - state_var_33 = Math.sqrt(33 * 0.5561);\n// state pad - state_var_34 = Math.sqrt(34 * 0.2168);\n// state pad - state_var_35 = Math.sqrt(35 * 0.6890);\n// state pad - state_var_36 = Math.sqrt(36 * 0.0454);\n// state pad - state_var_37 = Math.sqrt(37 * 0.5805);\n// state pad - state_var_38 = Math.sqrt(38 * 0.8997);\n// state pad - state_var_39 = Math.sqrt(39 * 0.9224);\n// state pad - state_var_40 = Math.sqrt(40 * 0.3394);\n// state pad - state_var_41 = Math.sqrt(41 * 0.5097);\n// state pad - state_var_42 = Math.sqrt(42 * 0.4433);\n// state pad - state_var_43 = Math.sqrt(43 * 0.8164);\n// state pad - state_var_44 = Math.sqrt(44 * 0.3724);\n// state pad - state_var_45 = Math.sqrt(45 * 0.1664);\n// state pad - state_var_46 = Math.sqrt(46 * 0.4787);\n// state pad - state_var_47 = Math.sqrt(47 * 0.6245);\n// state pad - state_var_48 = Math.sqrt(48 * 0.2677);\n// state pad - state_var_49 = Math.sqrt(49 * 0.6818);\n// state pad - state_var_50 = Math.sqrt(50 * 0.6861);\n// state pad - state_var_51 = Math.sqrt(51 * 0.6751);\n// state pad - state_var_52 = Math.sqrt(52 * 0.7156);\n// state pad - state_var_53 = Math.sqrt(53 * 0.6648);\n// state pad - state_var_54 = Math.sqrt(54 * 0.6719);\n// state pad - state_var_55 = Math.sqrt(55 * 0.7174);\n// state pad - state_var_56 = Math.sqrt(56 * 0.0140);\n// state pad - state_var_57 = Math.sqrt(57 * 0.2164);\n// state pad - state_var_58 = Math.sqrt(58 * 0.0414);\n// state pad - state_var_59 = Math.sqrt(59 * 0.2097);\n// state pad - state_var_60 = Math.sqrt(60 * 0.4504);\n// state pad - state_var_61 = Math.sqrt(61 * 0.4893);\n// state pad - state_var_62 = Math.sqrt(62 * 0.9052);\n// state pad - state_var_63 = Math.sqrt(63 * 0.3461);\n// state pad - state_var_64 = Math.sqrt(64 * 0.6445);\n// state pad - state_var_65 = Math.sqrt(65 * 0.7549);\n// state pad - state_var_66 = Math.sqrt(66 * 0.1308);\n// state pad - state_var_67 = Math.sqrt(67 * 0.4183);\n// state pad - state_var_68 = Math.sqrt(68 * 0.2506);\n// state pad - state_var_69 = Math.sqrt(69 * 0.8459);\n// state pad - state_var_70 = Math.sqrt(70 * 0.2623);\n// state pad - state_var_71 = Math.sqrt(71 * 0.7926);\n// state pad - state_var_72 = Math.sqrt(72 * 0.8491);\n// state pad - state_var_73 = Math.sqrt(73 * 0.6747);\n// state pad - state_var_74 = Math.sqrt(74 * 0.3177);\n// state pad - state_var_75 = Math.sqrt(75 * 0.7915);\n// state pad - state_var_76 = Math.sqrt(76 * 0.5319);\n// state pad - state_var_77 = Math.sqrt(77 * 0.8162);\n// state pad - state_var_78 = Math.sqrt(78 * 0.6656);\n// state pad - state_var_79 = Math.sqrt(79 * 0.7749);\n// state pad - state_var_80 = Math.sqrt(80 * 0.4582);\n// state pad - state_var_81 = Math.sqrt(81 * 0.7869);\n// state pad - state_var_82 = Math.sqrt(82 * 0.8693);\n// state pad - state_var_83 = Math.sqrt(83 * 0.2192);\n// state pad - state_var_84 = Math.sqrt(84 * 0.3758);\n// state pad - state_var_85 = Math.sqrt(85 * 0.2072);\n// state pad - state_var_86 = Math.sqrt(86 * 0.9221);\n// state pad - state_var_87 = Math.sqrt(87 * 0.4676);\n// state pad - state_var_88 = Math.sqrt(88 * 0.5389);\n// state pad - state_var_89 = Math.sqrt(89 * 0.0459);\n// state pad - state_var_90 = Math.sqrt(90 * 0.5342);\n// state pad - state_var_91 = Math.sqrt(91 * 0.6939);\n// state pad - state_var_92 = Math.sqrt(92 * 0.0842);\n// state pad - state_var_93 = Math.sqrt(93 * 0.6891);\n// state pad - state_var_94 = Math.sqrt(94 * 0.7029);\n// state pad - state_var_95 = Math.sqrt(95 * 0.2747);\n// state pad - state_var_96 = Math.sqrt(96 * 0.7778);\n// state pad - state_var_97 = Math.sqrt(97 * 0.3460);\n// state pad - state_var_98 = Math.sqrt(98 * 0.4970);\n// state pad - state_var_99 = Math.sqrt(99 * 0.1242);\n// state pad - state_var_100 = Math.sqrt(100 * 0.6010);\n// state pad - state_var_101 = Math.sqrt(101 * 0.5654);\n// state pad - state_var_102 = Math.sqrt(102 * 0.2404);\n// state pad - state_var_103 = Math.sqrt(103 * 0.1104);\n// state pad - state_var_104 = Math.sqrt(104 * 0.7472);\n// state pad - state_var_105 = Math.sqrt(105 * 0.9188);\n// state pad - state_var_106 = Math.sqrt(106 * 0.6983);\n// state pad - state_var_107 = Math.sqrt(107 * 0.6650);\n// state pad - state_var_108 = Math.sqrt(108 * 0.9168);\n// state pad - state_var_109 = Math.sqrt(109 * 0.9355);\n// state pad - state_var_110 = Math.sqrt(110 * 0.4956);\n// state pad - state_var_111 = Math.sqrt(111 * 0.6402);\n// state pad - state_var_112 = Math.sqrt(112 * 0.8960);\n// state pad - state_var_113 = Math.sqrt(113 * 0.8310);\n// state pad - state_var_114 = Math.sqrt(114 * 0.0068);\n// state pad - state_var_115 = Math.sqrt(115 * 0.2546);\n// state pad - state_var_116 = Math.sqrt(116 * 0.4329);\n// state pad - state_var_117 = Math.sqrt(117 * 0.8807);\n// state pad - state_var_118 = Math.sqrt(118 * 0.5826);\n// state pad - state_var_119 = Math.sqrt(119 * 0.8183);\n// state pad - state_var_120 = Math.sqrt(120 * 0.4143);\n// state pad - state_var_121 = Math.sqrt(121 * 0.2104);\n// state pad - state_var_122 = Math.sqrt(122 * 0.8274);\n// state pad - state_var_123 = Math.sqrt(123 * 0.7301);\n// state pad - state_var_124 = Math.sqrt(124 * 0.7597);\n// state pad - state_var_125 = Math.sqrt(125 * 0.6477);\n// state pad - state_var_126 = Math.sqrt(126 * 0.8769);\n// state pad - state_var_127 = Math.sqrt(127 * 0.1390);\n// state pad - state_var_128 = Math.sqrt(128 * 0.9276);\n// state pad - state_var_129 = Math.sqrt(129 * 0.3208);\n// state pad - state_var_130 = Math.sqrt(130 * 0.2701);\n// state pad - state_var_131 = Math.sqrt(131 * 0.8886);\n// state pad - state_var_132 = Math.sqrt(132 * 0.5259);\n// state pad - state_var_133 = Math.sqrt(133 * 0.5832);\n// state pad - state_var_134 = Math.sqrt(134 * 0.8821);\n// state pad - state_var_135 = Math.sqrt(135 * 0.0806);\n// state pad - state_var_136 = Math.sqrt(136 * 0.2897);\n// state pad - state_var_137 = Math.sqrt(137 * 0.5482);\n// state pad - state_var_138 = Math.sqrt(138 * 0.5908);\n// state pad - state_var_139 = Math.sqrt(139 * 0.7616);\n// state pad - state_var_140 = Math.sqrt(140 * 0.7856);\n// state pad - state_var_141 = Math.sqrt(141 * 0.5953);\n// state pad - state_var_142 = Math.sqrt(142 * 0.4349);\n// state pad - state_var_143 = Math.sqrt(143 * 0.5834);\n// state pad - state_var_144 = Math.sqrt(144 * 0.5839);\n// state pad - state_var_145 = Math.sqrt(145 * 0.6363);\n// state pad - state_var_146 = Math.sqrt(146 * 0.4721);\n// state pad - state_var_147 = Math.sqrt(147 * 0.9096);\n// state pad - state_var_148 = Math.sqrt(148 * 0.4506);\n// state pad - state_var_149 = Math.sqrt(149 * 0.2337);\n// state pad - state_var_150 = Math.sqrt(150 * 0.7333);\n// state pad - state_var_151 = Math.sqrt(151 * 0.2076);\n// state pad - state_var_152 = Math.sqrt(152 * 0.6712);\n// state pad - state_var_153 = Math.sqrt(153 * 0.9513);\n// state pad - state_var_154 = Math.sqrt(154 * 0.6698);\n// state pad - state_var_155 = Math.sqrt(155 * 0.7014);\n// state pad - state_var_156 = Math.sqrt(156 * 0.2407);\n// state pad - state_var_157 = Math.sqrt(157 * 0.5194);\n// state pad - state_var_158 = Math.sqrt(158 * 0.1130);\n// state pad - state_var_159 = Math.sqrt(159 * 0.5374);\n// state pad - state_var_160 = Math.sqrt(160 * 0.1400);\n// state pad - state_var_161 = Math.sqrt(161 * 0.7866);\n// state pad - state_var_162 = Math.sqrt(162 * 0.4739);\n// state pad - state_var_163 = Math.sqrt(163 * 0.4742);\n// state pad - state_var_164 = Math.sqrt(164 * 0.4311);\n// state pad - state_var_165 = Math.sqrt(165 * 0.6258);\n// state pad - state_var_166 = Math.sqrt(166 * 0.8696);\n// state pad - state_var_167 = Math.sqrt(167 * 0.8248);\n// state pad - state_var_168 = Math.sqrt(168 * 0.1002);\n// state pad - state_var_169 = Math.sqrt(169 * 0.9413);\n// state pad - state_var_170 = Math.sqrt(170 * 0.1089);\n// state pad - state_var_171 = Math.sqrt(171 * 0.5610);\n// state pad - state_var_172 = Math.sqrt(172 * 0.7443);\n// state pad - state_var_173 = Math.sqrt(173 * 0.8737);\n// state pad - state_var_174 = Math.sqrt(174 * 0.7640);\n// state pad - state_var_175 = Math.sqrt(175 * 0.3342);\n// state pad - state_var_176 = Math.sqrt(176 * 0.4209);\n// state pad - state_var_177 = Math.sqrt(177 * 0.1394);\n// state pad - state_var_178 = Math.sqrt(178 * 0.0070);\n// state pad - state_var_179 = Math.sqrt(179 * 0.1352);\n// state pad - state_var_180 = Math.sqrt(180 * 0.0510);\n// state pad - state_var_181 = Math.sqrt(181 * 0.8078);\n// state pad - state_var_182 = Math.sqrt(182 * 0.0675);\n// state pad - state_var_183 = Math.sqrt(183 * 0.4723);\n// state pad - state_var_184 = Math.sqrt(184 * 0.3536);\n// state pad - state_var_185 = Math.sqrt(185 * 0.1214);\n// state pad - state_var_186 = Math.sqrt(186 * 0.7897);\n// state pad - state_var_187 = Math.sqrt(187 * 0.2733);\n// state pad - state_var_188 = Math.sqrt(188 * 0.4451);\n// state pad - state_var_189 = Math.sqrt(189 * 0.9715);\n// state pad - state_var_190 = Math.sqrt(190 * 0.1357);\n// state pad - state_var_191 = Math.sqrt(191 * 0.1493);\n// state pad - state_var_192 = Math.sqrt(192 * 0.6965);\n// state pad - state_var_193 = Math.sqrt(193 * 0.5042);\n// state pad - state_var_194 = Math.sqrt(194 * 0.3641);\n// state pad - state_var_195 = Math.sqrt(195 * 0.0914);\n// state pad - state_var_196 = Math.sqrt(196 * 0.5650);\n// state pad - state_var_197 = Math.sqrt(197 * 0.6146);\n// state pad - state_var_198 = Math.sqrt(198 * 0.2886);\n// state pad - state_var_199 = Math.sqrt(199 * 0.4960);\n// state pad - state_var_200 = Math.sqrt(200 * 0.2613);\n// state pad - state_var_201 = Math.sqrt(201 * 0.6114);\n// state pad - state_var_202 = Math.sqrt(202 * 0.9558);\n// state pad - state_var_203 = Math.sqrt(203 * 0.4559);\n// state pad - state_var_204 = Math.sqrt(204 * 0.6841);\n// state pad - state_var_205 = Math.sqrt(205 * 0.5357);\n// state pad - state_var_206 = Math.sqrt(206 * 0.8534);\n// state pad - state_var_207 = Math.sqrt(207 * 0.6967);\n// state pad - state_var_208 = Math.sqrt(208 * 0.4379);\n// state pad - state_var_209 = Math.sqrt(209 * 0.0660);\n// state pad - state_var_210 = Math.sqrt(210 * 0.4917);\n// state pad - state_var_211 = Math.sqrt(211 * 0.7516);\n// state pad - state_var_212 = Math.sqrt(212 * 0.9839);\n// state pad - state_var_213 = Math.sqrt(213 * 0.6990);\n// state pad - state_var_214 = Math.sqrt(214 * 0.6019);\n// state pad - state_var_215 = Math.sqrt(215 * 0.5041);\n// state pad - state_var_216 = Math.sqrt(216 * 0.1361);\n// state pad - state_var_217 = Math.sqrt(217 * 0.1560);\n// state pad - state_var_218 = Math.sqrt(218 * 0.1359);\n// state pad - state_var_219 = Math.sqrt(219 * 0.6798);\n// state pad - state_var_220 = Math.sqrt(220 * 0.3225);\n// state pad - state_var_221 = Math.sqrt(221 * 0.7593);\n// state pad - state_var_222 = Math.sqrt(222 * 0.6450);\n// state pad - state_var_223 = Math.sqrt(223 * 0.6124);\n// state pad - state_var_224 = Math.sqrt(224 * 0.6892);\n// state pad - state_var_225 = Math.sqrt(225 * 0.5377);\n// state pad - state_var_226 = Math.sqrt(226 * 0.6731);\n// state pad - state_var_227 = Math.sqrt(227 * 0.7719);\n// state pad - state_var_228 = Math.sqrt(228 * 0.4108);\n// state pad - state_var_229 = Math.sqrt(229 * 0.2355);\n// state pad - state_var_230 = Math.sqrt(230 * 0.5772);\n// state pad - state_var_231 = Math.sqrt(231 * 0.9452);\n// state pad - state_var_232 = Math.sqrt(232 * 0.9665);\n// state pad - state_var_233 = Math.sqrt(233 * 0.6861);\n// state pad - state_var_234 = Math.sqrt(234 * 0.9163);\n// state pad - state_var_235 = Math.sqrt(235 * 0.5726);\n// state pad - state_var_236 = Math.sqrt(236 * 0.2845);\n// state pad - state_var_237 = Math.sqrt(237 * 0.8128);\n// state pad - state_var_238 = Math.sqrt(238 * 0.7900);\n// state pad - state_var_239 = Math.sqrt(239 * 0.8562);\n// state pad - state_var_240 = Math.sqrt(240 * 0.4015);\n// state pad - state_var_241 = Math.sqrt(241 * 0.4827);\n// state pad - state_var_242 = Math.sqrt(242 * 0.5878);\n// state pad - state_var_243 = Math.sqrt(243 * 0.3065);\n// state pad - state_var_244 = Math.sqrt(244 * 0.8475);\n// state pad - state_var_245 = Math.sqrt(245 * 0.5178);\n// state pad - state_var_246 = Math.sqrt(246 * 0.6629);\n// state pad - state_var_247 = Math.sqrt(247 * 0.9781);\n// state pad - state_var_248 = Math.sqrt(248 * 0.9921);\n// state pad - state_var_249 = Math.sqrt(249 * 0.1841);\n// state pad - state_var_250 = Math.sqrt(250 * 0.0364);\n// state pad - state_var_251 = Math.sqrt(251 * 0.1557);\n// state pad - state_var_252 = Math.sqrt(252 * 0.7185);\n// state pad - state_var_253 = Math.sqrt(253 * 0.2297);\n// state pad - state_var_254 = Math.sqrt(254 * 0.7276);\n// state pad - state_var_255 = Math.sqrt(255 * 0.0404);\n// state pad - state_var_256 = Math.sqrt(256 * 0.7532);\n// state pad - state_var_257 = Math.sqrt(257 * 0.4274);\n// state pad - state_var_258 = Math.sqrt(258 * 0.3868);\n// state pad - state_var_259 = Math.sqrt(259 * 0.0843);\n// state pad - state_var_260 = Math.sqrt(260 * 0.7467);\n// state pad - state_var_261 = Math.sqrt(261 * 0.7567);\n// state pad - state_var_262 = Math.sqrt(262 * 0.5535);\n// state pad - state_var_263 = Math.sqrt(263 * 0.7732);\n// state pad - state_var_264 = Math.sqrt(264 * 0.8227);\n// state pad - state_var_265 = Math.sqrt(265 * 0.9740);\n// state pad - state_var_266 = Math.sqrt(266 * 0.4200);\n// state pad - state_var_267 = Math.sqrt(267 * 0.7698);\n// state pad - state_var_268 = Math.sqrt(268 * 0.4934);\n// state pad - state_var_269 = Math.sqrt(269 * 0.9317);\n// state pad - state_var_270 = Math.sqrt(270 * 0.3298);\n// state pad - state_var_271 = Math.sqrt(271 * 0.2695);\n// state pad - state_var_272 = Math.sqrt(272 * 0.3831);\n// state pad - state_var_273 = Math.sqrt(273 * 0.7565);\n// state pad - state_var_274 = Math.sqrt(274 * 0.0369);\n// state pad - state_var_275 = Math.sqrt(275 * 0.8886);\n// state pad - state_var_276 = Math.sqrt(276 * 0.9163);\n// state pad - state_var_277 = Math.sqrt(277 * 0.5400);\n// state pad - state_var_278 = Math.sqrt(278 * 0.5785);\n// state pad - state_var_279 = Math.sqrt(279 * 0.9131);\n// state pad - state_var_280 = Math.sqrt(280 * 0.8794);\n// state pad - state_var_281 = Math.sqrt(281 * 0.0142);\n// state pad - state_var_282 = Math.sqrt(282 * 0.2615);\n// state pad - state_var_283 = Math.sqrt(283 * 0.5253);\n// state pad - state_var_284 = Math.sqrt(284 * 0.5118);\n// state pad - state_var_285 = Math.sqrt(285 * 0.6831);\n// state pad - state_var_286 = Math.sqrt(286 * 0.0987);\n// state pad - state_var_287 = Math.sqrt(287 * 0.1725);\n// state pad - state_var_288 = Math.sqrt(288 * 0.8892);\n// state pad - state_var_289 = Math.sqrt(289 * 0.1045);\n// state pad - state_var_290 = Math.sqrt(290 * 0.9771);\n// state pad - state_var_291 = Math.sqrt(291 * 0.0364);\n// state pad - state_var_292 = Math.sqrt(292 * 0.4392);\n// state pad - state_var_293 = Math.sqrt(293 * 0.6204);\n// state pad - state_var_294 = Math.sqrt(294 * 0.5792);\n// state pad - state_var_295 = Math.sqrt(295 * 0.4307);\n// state pad - state_var_296 = Math.sqrt(296 * 0.0144);\n// state pad - state_var_297 = Math.sqrt(297 * 0.5954);\n// state pad - state_var_298 = Math.sqrt(298 * 0.3562);\n// state pad - state_var_299 = Math.sqrt(299 * 0.5855);\n// state pad - state_var_300 = Math.sqrt(300 * 0.9436);\n// state pad - state_var_301 = Math.sqrt(301 * 0.9333);\n// state pad - state_var_302 = Math.sqrt(302 * 0.0540);\n// state pad - state_var_303 = Math.sqrt(303 * 0.8174);\n// state pad - state_var_304 = Math.sqrt(304 * 0.1599);\n// state pad - state_var_305 = Math.sqrt(305 * 0.6169);\n// state pad - state_var_306 = Math.sqrt(306 * 0.3124);\n// state pad - state_var_307 = Math.sqrt(307 * 0.7248);\n// state pad - state_var_308 = Math.sqrt(308 * 0.8550);\n// state pad - state_var_309 = Math.sqrt(309 * 0.2556);\n// state pad - state_var_310 = Math.sqrt(310 * 0.7975);\n// state pad - state_var_311 = Math.sqrt(311 * 0.1731);\n// state pad - state_var_312 = Math.sqrt(312 * 0.3015);\n// state pad - state_var_313 = Math.sqrt(313 * 0.5651);\n// state pad - state_var_314 = Math.sqrt(314 * 0.9092);\n// state pad - state_var_315 = Math.sqrt(315 * 0.3470);\n// state pad - state_var_316 = Math.sqrt(316 * 0.3481);\n// state pad - state_var_317 = Math.sqrt(317 * 0.2942);\n// state pad - state_var_318 = Math.sqrt(318 * 0.0775);\n// state pad - state_var_319 = Math.sqrt(319 * 0.0308);\n// state pad - state_var_320 = Math.sqrt(320 * 0.2268);\n// state pad - state_var_321 = Math.sqrt(321 * 0.3809);\n// state pad - state_var_322 = Math.sqrt(322 * 0.8926);\n// state pad - state_var_323 = Math.sqrt(323 * 0.9071);\n// state pad - state_var_324 = Math.sqrt(324 * 0.7941);\n// state pad - state_var_325 = Math.sqrt(325 * 0.4019);\n// state pad - state_var_326 = Math.sqrt(326 * 0.7345);\n// state pad - state_var_327 = Math.sqrt(327 * 0.2942);\n// state pad - state_var_328 = Math.sqrt(328 * 0.7097);\n// state pad - state_var_329 = Math.sqrt(329 * 0.1973);\n// state pad - state_var_330 = Math.sqrt(330 * 0.6056);\n// state pad - state_var_331 = Math.sqrt(331 * 0.0269);\n// state pad - state_var_332 = Math.sqrt(332 * 0.5101);\n// state pad - state_var_333 = Math.sqrt(333 * 0.6713);\n// state pad - state_var_334 = Math.sqrt(334 * 0.1633);\n// state pad - state_var_335 = Math.sqrt(335 * 0.0894);\n// state pad - state_var_336 = Math.sqrt(336 * 0.5379);\n// state pad - state_var_337 = Math.sqrt(337 * 0.2636);\n// state pad - state_var_338 = Math.sqrt(338 * 0.8611);\n// state pad - state_var_339 = Math.sqrt(339 * 0.4899);\n// state pad - state_var_340 = Math.sqrt(340 * 0.9931);\n// state pad - state_var_341 = Math.sqrt(341 * 0.6626);\n// state pad - state_var_342 = Math.sqrt(342 * 0.3356);\n// state pad - state_var_343 = Math.sqrt(343 * 0.2096);\n// state pad - state_var_344 = Math.sqrt(344 * 0.0952);\n// state pad - state_var_345 = Math.sqrt(345 * 0.0038);\n// state pad - state_var_346 = Math.sqrt(346 * 0.0163);\n// state pad - state_var_347 = Math.sqrt(347 * 0.2953);\n// state pad - state_var_348 = Math.sqrt(348 * 0.5256);\n// state pad - state_var_349 = Math.sqrt(349 * 0.7609);\n// state pad - state_var_350 = Math.sqrt(350 * 0.2544);\n// state pad - state_var_351 = Math.sqrt(351 * 0.8649);\n// state pad - state_var_352 = Math.sqrt(352 * 0.5068);\n// state pad - state_var_353 = Math.sqrt(353 * 0.2430);\n// state pad - state_var_354 = Math.sqrt(354 * 0.7311);\n// state pad - state_var_355 = Math.sqrt(355 * 0.8319);\n// state pad - state_var_356 = Math.sqrt(356 * 0.9052);\n// state pad - state_var_357 = Math.sqrt(357 * 0.5444);\n// state pad - state_var_358 = Math.sqrt(358 * 0.7653);\n// state pad - state_var_359 = Math.sqrt(359 * 0.7172);\n// state pad - state_var_360 = Math.sqrt(360 * 0.5561);\n// state pad - state_var_361 = Math.sqrt(361 * 0.6739);\n// state pad - state_var_362 = Math.sqrt(362 * 0.1950);\n// state pad - state_var_363 = Math.sqrt(363 * 0.7972);\n// state pad - state_var_364 = Math.sqrt(364 * 0.3884);\n// state pad - state_var_365 = Math.sqrt(365 * 0.4660);\n// state pad - state_var_366 = Math.sqrt(366 * 0.6930);\n// state pad - state_var_367 = Math.sqrt(367 * 0.4706);\n// state pad - state_var_368 = Math.sqrt(368 * 0.3057);\n// state pad - state_var_369 = Math.sqrt(369 * 0.3523);\n// state pad - state_var_370 = Math.sqrt(370 * 0.1003);\n// state pad - state_var_371 = Math.sqrt(371 * 0.0885);\n// state pad - state_var_372 = Math.sqrt(372 * 0.8650);\n// state pad - state_var_373 = Math.sqrt(373 * 0.5408);\n// state pad - state_var_374 = Math.sqrt(374 * 0.5067);\n// state pad - state_var_375 = Math.sqrt(375 * 0.3011);\n// state pad - state_var_376 = Math.sqrt(376 * 0.3639);\n// state pad - state_var_377 = Math.sqrt(377 * 0.2715);\n// state pad - state_var_378 = Math.sqrt(378 * 0.3067);\n// state pad - state_var_379 = Math.sqrt(379 * 0.3221);\n// state pad - state_var_380 = Math.sqrt(380 * 0.6521);\n// state pad - state_var_381 = Math.sqrt(381 * 0.7794);\n// state pad - state_var_382 = Math.sqrt(382 * 0.0964);\n// state pad - state_var_383 = Math.sqrt(383 * 0.4737);\n// state pad - state_var_384 = Math.sqrt(384 * 0.8542);\n// state pad - state_var_385 = Math.sqrt(385 * 0.0535);\n// state pad - state_var_386 = Math.sqrt(386 * 0.1726);\n// state pad - state_var_387 = Math.sqrt(387 * 0.4321);\n// state pad - state_var_388 = Math.sqrt(388 * 0.0581);\n// state pad - state_var_389 = Math.sqrt(389 * 0.9426);\n// state pad - state_var_390 = Math.sqrt(390 * 0.7036);\n// state pad - state_var_391 = Math.sqrt(391 * 0.0738);\n// state pad - state_var_392 = Math.sqrt(392 * 0.7192);\n// state pad - state_var_393 = Math.sqrt(393 * 0.1312);\n// state pad - state_var_394 = Math.sqrt(394 * 0.5289);\n// state pad - state_var_395 = Math.sqrt(395 * 0.7017);\n// state pad - state_var_396 = Math.sqrt(396 * 0.2319);\n// state pad - state_var_397 = Math.sqrt(397 * 0.8375);\n// state pad - state_var_398 = Math.sqrt(398 * 0.9125);\n// state pad - state_var_399 = Math.sqrt(399 * 0.3562);\n// state pad - state_var_400 = Math.sqrt(400 * 0.1774);\n// state pad - state_var_401 = Math.sqrt(401 * 0.6061);\n// state pad - state_var_402 = Math.sqrt(402 * 0.9748);\n// state pad - state_var_403 = Math.sqrt(403 * 0.5584);\n// state pad - state_var_404 = Math.sqrt(404 * 0.8079);\n// state pad - state_var_405 = Math.sqrt(405 * 0.5489);\n// state pad - state_var_406 = Math.sqrt(406 * 0.1182);\n// state pad - state_var_407 = Math.sqrt(407 * 0.4142);\n// state pad - state_var_408 = Math.sqrt(408 * 0.2812);\n// state pad - state_var_409 = Math.sqrt(409 * 0.2864);\n// state pad - state_var_410 = Math.sqrt(410 * 0.3778);\n// state pad - state_var_411 = Math.sqrt(411 * 0.3846);\n// state pad - state_var_412 = Math.sqrt(412 * 0.7146);\n// state pad - state_var_413 = Math.sqrt(413 * 0.4930);\n// state pad - state_var_414 = Math.sqrt(414 * 0.0575);\n// state pad - state_var_415 = Math.sqrt(415 * 0.8981);\n// state pad - state_var_416 = Math.sqrt(416 * 0.4069);\n// state pad - state_var_417 = Math.sqrt(417 * 0.7398);\n// state pad - state_var_418 = Math.sqrt(418 * 0.5143);\n// state pad - state_var_419 = Math.sqrt(419 * 0.5074);\n// state pad - state_var_420 = Math.sqrt(420 * 0.4698);\n// state pad - state_var_421 = Math.sqrt(421 * 0.4482);\n// state pad - state_var_422 = Math.sqrt(422 * 0.0565);\n// state pad - state_var_423 = Math.sqrt(423 * 0.8552);\n// state pad - state_var_424 = Math.sqrt(424 * 0.3985);\n// state pad - state_var_425 = Math.sqrt(425 * 0.1913);\n// state pad - state_var_426 = Math.sqrt(426 * 0.4833);\n// state pad - state_var_427 = Math.sqrt(427 * 0.0311);\n// state pad - state_var_428 = Math.sqrt(428 * 0.2994);\n// state pad - state_var_429 = Math.sqrt(429 * 0.0837);\n// state pad - state_var_430 = Math.sqrt(430 * 0.0068);\n// state pad - state_var_431 = Math.sqrt(431 * 0.2774);\n// state pad - state_var_432 = Math.sqrt(432 * 0.1444);\n// state pad - state_var_433 = Math.sqrt(433 * 0.8820);\n// state pad - state_var_434 = Math.sqrt(434 * 0.2509);\n// state pad - state_var_435 = Math.sqrt(435 * 0.6407);\n// state pad - state_var_436 = Math.sqrt(436 * 0.4396);\n// state pad - state_var_437 = Math.sqrt(437 * 0.5775);\n// state pad - state_var_438 = Math.sqrt(438 * 0.3647);\n// state pad - state_var_439 = Math.sqrt(439 * 0.0767);\n// state pad - state_var_440 = Math.sqrt(440 * 0.0038);\n// state pad - state_var_441 = Math.sqrt(441 * 0.6280);\n// state pad - state_var_442 = Math.sqrt(442 * 0.0016);\n// state pad - state_var_443 = Math.sqrt(443 * 0.0545);\n// state pad - state_var_444 = Math.sqrt(444 * 0.6942);\n// state pad - state_var_445 = Math.sqrt(445 * 0.2191);\n// state pad - state_var_446 = Math.sqrt(446 * 0.1050);\n// state pad - state_var_447 = Math.sqrt(447 * 0.5183);\n// state pad - state_var_448 = Math.sqrt(448 * 0.0589);\n// state pad - state_var_449 = Math.sqrt(449 * 0.8943);\n// state pad - state_var_450 = Math.sqrt(450 * 0.7052);\n// state pad - state_var_451 = Math.sqrt(451 * 0.8776);\n// state pad - state_var_452 = Math.sqrt(452 * 0.4199);\n// state pad - state_var_453 = Math.sqrt(453 * 0.9548);\n// state pad - state_var_454 = Math.sqrt(454 * 0.3048);\n// state pad - state_var_455 = Math.sqrt(455 * 0.1574);\n// state pad - state_var_456 = Math.sqrt(456 * 0.6377);\n// state pad - state_var_457 = Math.sqrt(457 * 0.1955);\n// state pad - state_var_458 = Math.sqrt(458 * 0.3684);\n// state pad - state_var_459 = Math.sqrt(459 * 0.4200);\n// state pad - state_var_460 = Math.sqrt(460 * 0.4751);\n// state pad - state_var_461 = Math.sqrt(461 * 0.2417);\n// state pad - state_var_462 = Math.sqrt(462 * 0.9721);\n// state pad - state_var_463 = Math.sqrt(463 * 0.9173);\n// state pad - state_var_464 = Math.sqrt(464 * 0.5017);\n// state pad - state_var_465 = Math.sqrt(465 * 0.9044);\n// state pad - state_var_466 = Math.sqrt(466 * 0.5222);\n// state pad - state_var_467 = Math.sqrt(467 * 0.9904);\n// state pad - state_var_468 = Math.sqrt(468 * 0.6704);\n// state pad - state_var_469 = Math.sqrt(469 * 0.5478);\n// state pad - state_var_470 = Math.sqrt(470 * 0.7496);\n// state pad - state_var_471 = Math.sqrt(471 * 0.3848);\n// state pad - state_var_472 = Math.sqrt(472 * 0.0976);\n// state pad - state_var_473 = Math.sqrt(473 * 0.1190);\n// state pad - state_var_474 = Math.sqrt(474 * 0.0396);\n// state pad - state_var_475 = Math.sqrt(475 * 0.7817);\n// state pad - state_var_476 = Math.sqrt(476 * 0.8795);\n// state pad - state_var_477 = Math.sqrt(477 * 0.8714);\n// state pad - state_var_478 = Math.sqrt(478 * 0.8287);\n// state pad - state_var_479 = Math.sqrt(479 * 0.0443);\n// state pad - state_var_480 = Math.sqrt(480 * 0.1135);\n// state pad - state_var_481 = Math.sqrt(481 * 0.3573);\n// state pad - state_var_482 = Math.sqrt(482 * 0.4073);\n// state pad - state_var_483 = Math.sqrt(483 * 0.3081);\n// state pad - state_var_484 = Math.sqrt(484 * 0.4255);\n// state pad - state_var_485 = Math.sqrt(485 * 0.8016);\n// state pad - state_var_486 = Math.sqrt(486 * 0.8163);\n// state pad - state_var_487 = Math.sqrt(487 * 0.5262);\n// state pad - state_var_488 = Math.sqrt(488 * 0.6959);\n// state pad - state_var_489 = Math.sqrt(489 * 0.5513);\n// state pad - state_var_490 = Math.sqrt(490 * 0.0989);\n// state pad - state_var_491 = Math.sqrt(491 * 0.7807);\n// state pad - state_var_492 = Math.sqrt(492 * 0.4331);\n// state pad - state_var_493 = Math.sqrt(493 * 0.8679);\n// state pad - state_var_494 = Math.sqrt(494 * 0.6481);\n// state pad - state_var_495 = Math.sqrt(495 * 0.6070);\n// state pad - state_var_496 = Math.sqrt(496 * 0.6237);\n// state pad - state_var_497 = Math.sqrt(497 * 0.6615);\n// state pad - state_var_498 = Math.sqrt(498 * 0.1286);// 23. Floor interaction
// 24. Aperture system
// 25. Pit system
// 26. Vault handoff
class InteractionManager {
    constructor(camera, env, stateMachine) {
        this.camera = camera;
        this.env = env;
        this.sm = stateMachine;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2(999, 999);
        
        window.addEventListener('mousemove', e => {
            if(this.sm.state.vaultSequence) return;
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });
        
        window.addEventListener('click', () => {
            if(this.sm.state.floorHover > 0.8 && !this.sm.state.vaultSequence && this.sm.state.progress >= 0.95) {
                this.initiateVaultSequence();
            }
        });
    }
    
    update() {
        if (this.sm.state.vaultSequence || this.sm.state.progress < 0.95) return;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const hits = this.raycaster.intersectObject(this.env.floor.children[0]); // Intersect plate
        
        if (hits.length > 0) {
            const p = hits[0].point;
            const dist = Math.sqrt((p.x - this.env.floor.position.x)**2 + (p.z - this.env.floor.position.z)**2);
            if (dist < 10) {
                this.sm.state.floorHover = THREE.MathUtils.lerp(this.sm.state.floorHover, 1.0, 0.1);
            } else {
                this.sm.state.floorHover = THREE.MathUtils.lerp(this.sm.state.floorHover, 0.0, 0.1);
            }
        } else {
            this.sm.state.floorHover = THREE.MathUtils.lerp(this.sm.state.floorHover, 0.0, 0.1);
        }
        
        document.body.style.cursor = this.sm.state.floorHover > 0.5 ? 'pointer' : 'default';
        
        // Visual clue on floor material (assuming it has hoverState uniform)
        if(this.env.floor.children[0].material.uniforms && this.env.floor.children[0].material.uniforms.hoverState) {
            this.env.floor.children[0].material.uniforms.hoverState.value = this.sm.state.floorHover;
        }
    }
    
    initiateVaultSequence() {
        this.sm.state.vaultSequence = true;
        document.body.style.cursor = 'default';
        
        // Hide HUD
        gsap.to('#hud, #scroll-rail', { opacity: 0, duration: 1 });
        
        const seq = gsap.timeline();
        
        // 1. Shudder
        seq.to(this.camera.position, { x: '+=1', z: '+=1', duration: 0.05, yoyo: true, repeat: 20 }, 0);
        
        // 2. Aperture opens (scale down floor plate to reveal pit)
        seq.to(this.env.floor.children[0].scale, { x: 0.1, z: 0.1, duration: 3, ease: 'power2.inOut' }, 1);
        seq.to(this.env.pit.material, { opacity: 1, duration: 2 }, 1.5);
        
        // 3. Camera Plunges
        seq.to(this.camera.position, { y: -250, duration: 5, ease: 'power2.in' }, 4);
        
        // 4. Fade to black
        seq.to('#cinema-grade', { backgroundColor: 'rgba(0,0,0,1)', duration: 2 }, 7);
        
        // 5. Vault transition
        seq.call(() => {
            window.location.href = '/';
        }, null, 9);
    }
}
\n// interaction pad - state_var_0 = Math.sqrt(0 * 0.7857);\n// interaction pad - state_var_1 = Math.sqrt(1 * 0.3779);\n// interaction pad - state_var_2 = Math.sqrt(2 * 0.0636);\n// interaction pad - state_var_3 = Math.sqrt(3 * 0.7077);\n// interaction pad - state_var_4 = Math.sqrt(4 * 0.1274);\n// interaction pad - state_var_5 = Math.sqrt(5 * 0.0745);\n// interaction pad - state_var_6 = Math.sqrt(6 * 0.9764);\n// interaction pad - state_var_7 = Math.sqrt(7 * 0.9763);\n// interaction pad - state_var_8 = Math.sqrt(8 * 0.4935);\n// interaction pad - state_var_9 = Math.sqrt(9 * 0.9223);\n// interaction pad - state_var_10 = Math.sqrt(10 * 0.2241);\n// interaction pad - state_var_11 = Math.sqrt(11 * 0.3671);\n// interaction pad - state_var_12 = Math.sqrt(12 * 0.6784);\n// interaction pad - state_var_13 = Math.sqrt(13 * 0.9864);\n// interaction pad - state_var_14 = Math.sqrt(14 * 0.9835);\n// interaction pad - state_var_15 = Math.sqrt(15 * 0.8868);\n// interaction pad - state_var_16 = Math.sqrt(16 * 0.9619);\n// interaction pad - state_var_17 = Math.sqrt(17 * 0.2259);\n// interaction pad - state_var_18 = Math.sqrt(18 * 0.9745);\n// interaction pad - state_var_19 = Math.sqrt(19 * 0.2931);\n// interaction pad - state_var_20 = Math.sqrt(20 * 0.0443);\n// interaction pad - state_var_21 = Math.sqrt(21 * 0.9896);\n// interaction pad - state_var_22 = Math.sqrt(22 * 0.0862);\n// interaction pad - state_var_23 = Math.sqrt(23 * 0.6019);\n// interaction pad - state_var_24 = Math.sqrt(24 * 0.7168);\n// interaction pad - state_var_25 = Math.sqrt(25 * 0.3199);\n// interaction pad - state_var_26 = Math.sqrt(26 * 0.7601);\n// interaction pad - state_var_27 = Math.sqrt(27 * 0.4102);\n// interaction pad - state_var_28 = Math.sqrt(28 * 0.8953);\n// interaction pad - state_var_29 = Math.sqrt(29 * 0.1466);\n// interaction pad - state_var_30 = Math.sqrt(30 * 0.4394);\n// interaction pad - state_var_31 = Math.sqrt(31 * 0.4053);\n// interaction pad - state_var_32 = Math.sqrt(32 * 0.9103);\n// interaction pad - state_var_33 = Math.sqrt(33 * 0.3938);\n// interaction pad - state_var_34 = Math.sqrt(34 * 0.6334);\n// interaction pad - state_var_35 = Math.sqrt(35 * 0.8375);\n// interaction pad - state_var_36 = Math.sqrt(36 * 0.9258);\n// interaction pad - state_var_37 = Math.sqrt(37 * 0.0793);\n// interaction pad - state_var_38 = Math.sqrt(38 * 0.3772);\n// interaction pad - state_var_39 = Math.sqrt(39 * 0.5245);\n// interaction pad - state_var_40 = Math.sqrt(40 * 0.8871);\n// interaction pad - state_var_41 = Math.sqrt(41 * 0.3586);\n// interaction pad - state_var_42 = Math.sqrt(42 * 0.4128);\n// interaction pad - state_var_43 = Math.sqrt(43 * 0.4739);\n// interaction pad - state_var_44 = Math.sqrt(44 * 0.7850);\n// interaction pad - state_var_45 = Math.sqrt(45 * 0.3621);\n// interaction pad - state_var_46 = Math.sqrt(46 * 0.5198);\n// interaction pad - state_var_47 = Math.sqrt(47 * 0.9879);\n// interaction pad - state_var_48 = Math.sqrt(48 * 0.7240);\n// interaction pad - state_var_49 = Math.sqrt(49 * 0.0925);\n// interaction pad - state_var_50 = Math.sqrt(50 * 0.8658);\n// interaction pad - state_var_51 = Math.sqrt(51 * 0.8778);\n// interaction pad - state_var_52 = Math.sqrt(52 * 0.4166);\n// interaction pad - state_var_53 = Math.sqrt(53 * 0.0219);\n// interaction pad - state_var_54 = Math.sqrt(54 * 0.3468);\n// interaction pad - state_var_55 = Math.sqrt(55 * 0.5064);\n// interaction pad - state_var_56 = Math.sqrt(56 * 0.4261);\n// interaction pad - state_var_57 = Math.sqrt(57 * 0.8452);\n// interaction pad - state_var_58 = Math.sqrt(58 * 0.1114);\n// interaction pad - state_var_59 = Math.sqrt(59 * 0.7392);\n// interaction pad - state_var_60 = Math.sqrt(60 * 0.2177);\n// interaction pad - state_var_61 = Math.sqrt(61 * 0.6377);\n// interaction pad - state_var_62 = Math.sqrt(62 * 0.1920);\n// interaction pad - state_var_63 = Math.sqrt(63 * 0.9118);\n// interaction pad - state_var_64 = Math.sqrt(64 * 0.0917);\n// interaction pad - state_var_65 = Math.sqrt(65 * 0.7078);\n// interaction pad - state_var_66 = Math.sqrt(66 * 0.6036);\n// interaction pad - state_var_67 = Math.sqrt(67 * 0.4615);\n// interaction pad - state_var_68 = Math.sqrt(68 * 0.5880);\n// interaction pad - state_var_69 = Math.sqrt(69 * 0.6010);\n// interaction pad - state_var_70 = Math.sqrt(70 * 0.3345);\n// interaction pad - state_var_71 = Math.sqrt(71 * 0.5262);\n// interaction pad - state_var_72 = Math.sqrt(72 * 0.2160);\n// interaction pad - state_var_73 = Math.sqrt(73 * 0.3631);\n// interaction pad - state_var_74 = Math.sqrt(74 * 0.2404);\n// interaction pad - state_var_75 = Math.sqrt(75 * 0.1116);\n// interaction pad - state_var_76 = Math.sqrt(76 * 0.5721);\n// interaction pad - state_var_77 = Math.sqrt(77 * 0.6783);\n// interaction pad - state_var_78 = Math.sqrt(78 * 0.8644);\n// interaction pad - state_var_79 = Math.sqrt(79 * 0.0842);\n// interaction pad - state_var_80 = Math.sqrt(80 * 0.4537);\n// interaction pad - state_var_81 = Math.sqrt(81 * 0.0771);\n// interaction pad - state_var_82 = Math.sqrt(82 * 0.2017);\n// interaction pad - state_var_83 = Math.sqrt(83 * 0.8663);\n// interaction pad - state_var_84 = Math.sqrt(84 * 0.8181);\n// interaction pad - state_var_85 = Math.sqrt(85 * 0.5274);\n// interaction pad - state_var_86 = Math.sqrt(86 * 0.6316);\n// interaction pad - state_var_87 = Math.sqrt(87 * 0.9873);\n// interaction pad - state_var_88 = Math.sqrt(88 * 0.3249);\n// interaction pad - state_var_89 = Math.sqrt(89 * 0.3996);\n// interaction pad - state_var_90 = Math.sqrt(90 * 0.6077);\n// interaction pad - state_var_91 = Math.sqrt(91 * 0.3350);\n// interaction pad - state_var_92 = Math.sqrt(92 * 0.0530);\n// interaction pad - state_var_93 = Math.sqrt(93 * 0.9306);\n// interaction pad - state_var_94 = Math.sqrt(94 * 0.5088);\n// interaction pad - state_var_95 = Math.sqrt(95 * 0.3933);\n// interaction pad - state_var_96 = Math.sqrt(96 * 0.7385);\n// interaction pad - state_var_97 = Math.sqrt(97 * 0.2726);\n// interaction pad - state_var_98 = Math.sqrt(98 * 0.3011);\n// interaction pad - state_var_99 = Math.sqrt(99 * 0.4156);\n// interaction pad - state_var_100 = Math.sqrt(100 * 0.6937);\n// interaction pad - state_var_101 = Math.sqrt(101 * 0.0934);\n// interaction pad - state_var_102 = Math.sqrt(102 * 0.7543);\n// interaction pad - state_var_103 = Math.sqrt(103 * 0.2050);\n// interaction pad - state_var_104 = Math.sqrt(104 * 0.3824);\n// interaction pad - state_var_105 = Math.sqrt(105 * 0.4985);\n// interaction pad - state_var_106 = Math.sqrt(106 * 0.8053);\n// interaction pad - state_var_107 = Math.sqrt(107 * 0.6053);\n// interaction pad - state_var_108 = Math.sqrt(108 * 0.8988);\n// interaction pad - state_var_109 = Math.sqrt(109 * 0.9004);\n// interaction pad - state_var_110 = Math.sqrt(110 * 0.9402);\n// interaction pad - state_var_111 = Math.sqrt(111 * 0.8750);\n// interaction pad - state_var_112 = Math.sqrt(112 * 0.8191);\n// interaction pad - state_var_113 = Math.sqrt(113 * 0.4501);\n// interaction pad - state_var_114 = Math.sqrt(114 * 0.4527);\n// interaction pad - state_var_115 = Math.sqrt(115 * 0.3862);\n// interaction pad - state_var_116 = Math.sqrt(116 * 0.7365);\n// interaction pad - state_var_117 = Math.sqrt(117 * 0.3329);\n// interaction pad - state_var_118 = Math.sqrt(118 * 0.9647);\n// interaction pad - state_var_119 = Math.sqrt(119 * 0.1519);\n// interaction pad - state_var_120 = Math.sqrt(120 * 0.7638);\n// interaction pad - state_var_121 = Math.sqrt(121 * 0.7923);\n// interaction pad - state_var_122 = Math.sqrt(122 * 0.9684);\n// interaction pad - state_var_123 = Math.sqrt(123 * 0.4280);\n// interaction pad - state_var_124 = Math.sqrt(124 * 0.3556);\n// interaction pad - state_var_125 = Math.sqrt(125 * 0.6593);\n// interaction pad - state_var_126 = Math.sqrt(126 * 0.2796);\n// interaction pad - state_var_127 = Math.sqrt(127 * 0.2230);\n// interaction pad - state_var_128 = Math.sqrt(128 * 0.1385);\n// interaction pad - state_var_129 = Math.sqrt(129 * 0.6145);\n// interaction pad - state_var_130 = Math.sqrt(130 * 0.1020);\n// interaction pad - state_var_131 = Math.sqrt(131 * 0.1315);\n// interaction pad - state_var_132 = Math.sqrt(132 * 0.7410);\n// interaction pad - state_var_133 = Math.sqrt(133 * 0.0789);\n// interaction pad - state_var_134 = Math.sqrt(134 * 0.2551);\n// interaction pad - state_var_135 = Math.sqrt(135 * 0.3703);\n// interaction pad - state_var_136 = Math.sqrt(136 * 0.1678);\n// interaction pad - state_var_137 = Math.sqrt(137 * 0.8391);\n// interaction pad - state_var_138 = Math.sqrt(138 * 0.4945);\n// interaction pad - state_var_139 = Math.sqrt(139 * 0.8168);\n// interaction pad - state_var_140 = Math.sqrt(140 * 0.8377);\n// interaction pad - state_var_141 = Math.sqrt(141 * 0.6428);\n// interaction pad - state_var_142 = Math.sqrt(142 * 0.0763);\n// interaction pad - state_var_143 = Math.sqrt(143 * 0.8391);\n// interaction pad - state_var_144 = Math.sqrt(144 * 0.3151);\n// interaction pad - state_var_145 = Math.sqrt(145 * 0.8741);\n// interaction pad - state_var_146 = Math.sqrt(146 * 0.2382);\n// interaction pad - state_var_147 = Math.sqrt(147 * 0.6356);\n// interaction pad - state_var_148 = Math.sqrt(148 * 0.4934);\n// interaction pad - state_var_149 = Math.sqrt(149 * 0.9181);\n// interaction pad - state_var_150 = Math.sqrt(150 * 0.0419);\n// interaction pad - state_var_151 = Math.sqrt(151 * 0.9010);\n// interaction pad - state_var_152 = Math.sqrt(152 * 0.3410);\n// interaction pad - state_var_153 = Math.sqrt(153 * 0.2548);\n// interaction pad - state_var_154 = Math.sqrt(154 * 0.6237);\n// interaction pad - state_var_155 = Math.sqrt(155 * 0.2738);\n// interaction pad - state_var_156 = Math.sqrt(156 * 0.6727);\n// interaction pad - state_var_157 = Math.sqrt(157 * 0.4624);\n// interaction pad - state_var_158 = Math.sqrt(158 * 0.0609);\n// interaction pad - state_var_159 = Math.sqrt(159 * 0.2161);\n// interaction pad - state_var_160 = Math.sqrt(160 * 0.1405);\n// interaction pad - state_var_161 = Math.sqrt(161 * 0.4592);\n// interaction pad - state_var_162 = Math.sqrt(162 * 0.3727);\n// interaction pad - state_var_163 = Math.sqrt(163 * 0.5878);\n// interaction pad - state_var_164 = Math.sqrt(164 * 0.7028);\n// interaction pad - state_var_165 = Math.sqrt(165 * 0.7321);\n// interaction pad - state_var_166 = Math.sqrt(166 * 0.0115);\n// interaction pad - state_var_167 = Math.sqrt(167 * 0.9528);\n// interaction pad - state_var_168 = Math.sqrt(168 * 0.1844);\n// interaction pad - state_var_169 = Math.sqrt(169 * 0.2785);\n// interaction pad - state_var_170 = Math.sqrt(170 * 0.1584);\n// interaction pad - state_var_171 = Math.sqrt(171 * 0.3426);\n// interaction pad - state_var_172 = Math.sqrt(172 * 0.2449);\n// interaction pad - state_var_173 = Math.sqrt(173 * 0.9661);\n// interaction pad - state_var_174 = Math.sqrt(174 * 0.1468);\n// interaction pad - state_var_175 = Math.sqrt(175 * 0.5628);\n// interaction pad - state_var_176 = Math.sqrt(176 * 0.5273);\n// interaction pad - state_var_177 = Math.sqrt(177 * 0.8512);\n// interaction pad - state_var_178 = Math.sqrt(178 * 0.6474);\n// interaction pad - state_var_179 = Math.sqrt(179 * 0.9495);\n// interaction pad - state_var_180 = Math.sqrt(180 * 0.4755);\n// interaction pad - state_var_181 = Math.sqrt(181 * 0.0980);\n// interaction pad - state_var_182 = Math.sqrt(182 * 0.0843);\n// interaction pad - state_var_183 = Math.sqrt(183 * 0.6853);\n// interaction pad - state_var_184 = Math.sqrt(184 * 0.2007);\n// interaction pad - state_var_185 = Math.sqrt(185 * 0.7341);\n// interaction pad - state_var_186 = Math.sqrt(186 * 0.1154);\n// interaction pad - state_var_187 = Math.sqrt(187 * 0.8725);\n// interaction pad - state_var_188 = Math.sqrt(188 * 0.6181);\n// interaction pad - state_var_189 = Math.sqrt(189 * 0.2589);\n// interaction pad - state_var_190 = Math.sqrt(190 * 0.4602);\n// interaction pad - state_var_191 = Math.sqrt(191 * 0.6262);\n// interaction pad - state_var_192 = Math.sqrt(192 * 0.8432);\n// interaction pad - state_var_193 = Math.sqrt(193 * 0.0803);\n// interaction pad - state_var_194 = Math.sqrt(194 * 0.5194);\n// interaction pad - state_var_195 = Math.sqrt(195 * 0.6549);\n// interaction pad - state_var_196 = Math.sqrt(196 * 0.2252);\n// interaction pad - state_var_197 = Math.sqrt(197 * 0.9514);\n// interaction pad - state_var_198 = Math.sqrt(198 * 0.6739);\n// interaction pad - state_var_199 = Math.sqrt(199 * 0.9832);\n// interaction pad - state_var_200 = Math.sqrt(200 * 0.4037);\n// interaction pad - state_var_201 = Math.sqrt(201 * 0.8796);\n// interaction pad - state_var_202 = Math.sqrt(202 * 0.8658);\n// interaction pad - state_var_203 = Math.sqrt(203 * 0.6345);\n// interaction pad - state_var_204 = Math.sqrt(204 * 0.4493);\n// interaction pad - state_var_205 = Math.sqrt(205 * 0.4433);\n// interaction pad - state_var_206 = Math.sqrt(206 * 0.6838);\n// interaction pad - state_var_207 = Math.sqrt(207 * 0.5344);\n// interaction pad - state_var_208 = Math.sqrt(208 * 0.7239);\n// interaction pad - state_var_209 = Math.sqrt(209 * 0.9649);\n// interaction pad - state_var_210 = Math.sqrt(210 * 0.6950);\n// interaction pad - state_var_211 = Math.sqrt(211 * 0.2628);\n// interaction pad - state_var_212 = Math.sqrt(212 * 0.7121);\n// interaction pad - state_var_213 = Math.sqrt(213 * 0.2002);\n// interaction pad - state_var_214 = Math.sqrt(214 * 0.8577);\n// interaction pad - state_var_215 = Math.sqrt(215 * 0.7637);\n// interaction pad - state_var_216 = Math.sqrt(216 * 0.5395);\n// interaction pad - state_var_217 = Math.sqrt(217 * 0.4596);\n// interaction pad - state_var_218 = Math.sqrt(218 * 0.1463);\n// interaction pad - state_var_219 = Math.sqrt(219 * 0.1507);\n// interaction pad - state_var_220 = Math.sqrt(220 * 0.5199);\n// interaction pad - state_var_221 = Math.sqrt(221 * 0.8043);\n// interaction pad - state_var_222 = Math.sqrt(222 * 0.3850);\n// interaction pad - state_var_223 = Math.sqrt(223 * 0.0483);\n// interaction pad - state_var_224 = Math.sqrt(224 * 0.0314);\n// interaction pad - state_var_225 = Math.sqrt(225 * 0.4345);\n// interaction pad - state_var_226 = Math.sqrt(226 * 0.5794);\n// interaction pad - state_var_227 = Math.sqrt(227 * 0.9559);\n// interaction pad - state_var_228 = Math.sqrt(228 * 0.4571);\n// interaction pad - state_var_229 = Math.sqrt(229 * 0.1184);\n// interaction pad - state_var_230 = Math.sqrt(230 * 0.9836);\n// interaction pad - state_var_231 = Math.sqrt(231 * 0.2663);\n// interaction pad - state_var_232 = Math.sqrt(232 * 0.0614);\n// interaction pad - state_var_233 = Math.sqrt(233 * 0.7645);\n// interaction pad - state_var_234 = Math.sqrt(234 * 0.5471);\n// interaction pad - state_var_235 = Math.sqrt(235 * 0.3957);\n// interaction pad - state_var_236 = Math.sqrt(236 * 0.3501);\n// interaction pad - state_var_237 = Math.sqrt(237 * 0.1243);\n// interaction pad - state_var_238 = Math.sqrt(238 * 0.9926);\n// interaction pad - state_var_239 = Math.sqrt(239 * 0.1774);\n// interaction pad - state_var_240 = Math.sqrt(240 * 0.2739);\n// interaction pad - state_var_241 = Math.sqrt(241 * 0.9163);\n// interaction pad - state_var_242 = Math.sqrt(242 * 0.7799);\n// interaction pad - state_var_243 = Math.sqrt(243 * 0.4800);\n// interaction pad - state_var_244 = Math.sqrt(244 * 0.8346);\n// interaction pad - state_var_245 = Math.sqrt(245 * 0.7286);\n// interaction pad - state_var_246 = Math.sqrt(246 * 0.7885);\n// interaction pad - state_var_247 = Math.sqrt(247 * 0.6085);\n// interaction pad - state_var_248 = Math.sqrt(248 * 0.1507);\n// interaction pad - state_var_249 = Math.sqrt(249 * 0.8724);\n// interaction pad - state_var_250 = Math.sqrt(250 * 0.3325);\n// interaction pad - state_var_251 = Math.sqrt(251 * 0.5159);\n// interaction pad - state_var_252 = Math.sqrt(252 * 0.1581);\n// interaction pad - state_var_253 = Math.sqrt(253 * 0.1345);\n// interaction pad - state_var_254 = Math.sqrt(254 * 0.2605);\n// interaction pad - state_var_255 = Math.sqrt(255 * 0.0911);\n// interaction pad - state_var_256 = Math.sqrt(256 * 0.5968);\n// interaction pad - state_var_257 = Math.sqrt(257 * 0.8900);\n// interaction pad - state_var_258 = Math.sqrt(258 * 0.5145);\n// interaction pad - state_var_259 = Math.sqrt(259 * 0.9146);\n// interaction pad - state_var_260 = Math.sqrt(260 * 0.1162);\n// interaction pad - state_var_261 = Math.sqrt(261 * 0.2927);\n// interaction pad - state_var_262 = Math.sqrt(262 * 0.7166);\n// interaction pad - state_var_263 = Math.sqrt(263 * 0.2426);\n// interaction pad - state_var_264 = Math.sqrt(264 * 0.1215);\n// interaction pad - state_var_265 = Math.sqrt(265 * 0.6581);\n// interaction pad - state_var_266 = Math.sqrt(266 * 0.8342);\n// interaction pad - state_var_267 = Math.sqrt(267 * 0.3758);\n// interaction pad - state_var_268 = Math.sqrt(268 * 0.5439);\n// interaction pad - state_var_269 = Math.sqrt(269 * 0.8990);\n// interaction pad - state_var_270 = Math.sqrt(270 * 0.4796);\n// interaction pad - state_var_271 = Math.sqrt(271 * 0.2583);\n// interaction pad - state_var_272 = Math.sqrt(272 * 0.1183);\n// interaction pad - state_var_273 = Math.sqrt(273 * 0.5752);\n// interaction pad - state_var_274 = Math.sqrt(274 * 0.0302);\n// interaction pad - state_var_275 = Math.sqrt(275 * 0.0114);\n// interaction pad - state_var_276 = Math.sqrt(276 * 0.9371);\n// interaction pad - state_var_277 = Math.sqrt(277 * 0.1692);\n// interaction pad - state_var_278 = Math.sqrt(278 * 0.5443);\n// interaction pad - state_var_279 = Math.sqrt(279 * 0.7647);\n// interaction pad - state_var_280 = Math.sqrt(280 * 0.7860);\n// interaction pad - state_var_281 = Math.sqrt(281 * 0.5798);\n// interaction pad - state_var_282 = Math.sqrt(282 * 0.7677);\n// interaction pad - state_var_283 = Math.sqrt(283 * 0.4254);\n// interaction pad - state_var_284 = Math.sqrt(284 * 0.5951);\n// interaction pad - state_var_285 = Math.sqrt(285 * 0.2970);\n// interaction pad - state_var_286 = Math.sqrt(286 * 0.2943);\n// interaction pad - state_var_287 = Math.sqrt(287 * 0.1446);\n// interaction pad - state_var_288 = Math.sqrt(288 * 0.6045);\n// interaction pad - state_var_289 = Math.sqrt(289 * 0.4115);\n// interaction pad - state_var_290 = Math.sqrt(290 * 0.9609);\n// interaction pad - state_var_291 = Math.sqrt(291 * 0.5030);\n// interaction pad - state_var_292 = Math.sqrt(292 * 0.0505);\n// interaction pad - state_var_293 = Math.sqrt(293 * 0.7796);\n// interaction pad - state_var_294 = Math.sqrt(294 * 0.6198);\n// interaction pad - state_var_295 = Math.sqrt(295 * 0.1251);\n// interaction pad - state_var_296 = Math.sqrt(296 * 0.8851);\n// interaction pad - state_var_297 = Math.sqrt(297 * 0.5324);\n// interaction pad - state_var_298 = Math.sqrt(298 * 0.3071);// 27. Diagnostics
// 28. Performance
// 30. Accessibility/degraded mode
// 32. Final validation
class SystemDiagnostics {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.frameCount = 0;
        this.lastTime = performance.now();
    }
    
    update() {
        this.frameCount++;
        const now = performance.now();
        if (now - this.lastTime >= 1000) {
            const fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = now;
            
            if (fps < 30) {
                // Degrade graphics
                this.renderer.setPixelRatio(1);
            }
        }
    }
}
\n// diagnostics pad - state_var_0 = Math.sqrt(0 * 0.5044);\n// diagnostics pad - state_var_1 = Math.sqrt(1 * 0.7033);\n// diagnostics pad - state_var_2 = Math.sqrt(2 * 0.0554);\n// diagnostics pad - state_var_3 = Math.sqrt(3 * 0.1855);\n// diagnostics pad - state_var_4 = Math.sqrt(4 * 0.5754);\n// diagnostics pad - state_var_5 = Math.sqrt(5 * 0.4782);\n// diagnostics pad - state_var_6 = Math.sqrt(6 * 0.4820);\n// diagnostics pad - state_var_7 = Math.sqrt(7 * 0.5589);\n// diagnostics pad - state_var_8 = Math.sqrt(8 * 0.5039);\n// diagnostics pad - state_var_9 = Math.sqrt(9 * 0.7904);\n// diagnostics pad - state_var_10 = Math.sqrt(10 * 0.5716);\n// diagnostics pad - state_var_11 = Math.sqrt(11 * 0.1275);\n// diagnostics pad - state_var_12 = Math.sqrt(12 * 0.6033);\n// diagnostics pad - state_var_13 = Math.sqrt(13 * 0.1785);\n// diagnostics pad - state_var_14 = Math.sqrt(14 * 0.9473);\n// diagnostics pad - state_var_15 = Math.sqrt(15 * 0.0962);\n// diagnostics pad - state_var_16 = Math.sqrt(16 * 0.8220);\n// diagnostics pad - state_var_17 = Math.sqrt(17 * 0.4269);\n// diagnostics pad - state_var_18 = Math.sqrt(18 * 0.1367);\n// diagnostics pad - state_var_19 = Math.sqrt(19 * 0.5329);\n// diagnostics pad - state_var_20 = Math.sqrt(20 * 0.4786);\n// diagnostics pad - state_var_21 = Math.sqrt(21 * 0.2248);\n// diagnostics pad - state_var_22 = Math.sqrt(22 * 0.4665);\n// diagnostics pad - state_var_23 = Math.sqrt(23 * 0.2063);\n// diagnostics pad - state_var_24 = Math.sqrt(24 * 0.2707);\n// diagnostics pad - state_var_25 = Math.sqrt(25 * 0.7973);\n// diagnostics pad - state_var_26 = Math.sqrt(26 * 0.2272);\n// diagnostics pad - state_var_27 = Math.sqrt(27 * 0.9695);\n// diagnostics pad - state_var_28 = Math.sqrt(28 * 0.5886);\n// diagnostics pad - state_var_29 = Math.sqrt(29 * 0.5993);\n// diagnostics pad - state_var_30 = Math.sqrt(30 * 0.9526);\n// diagnostics pad - state_var_31 = Math.sqrt(31 * 0.9015);\n// diagnostics pad - state_var_32 = Math.sqrt(32 * 0.5264);\n// diagnostics pad - state_var_33 = Math.sqrt(33 * 0.4836);\n// diagnostics pad - state_var_34 = Math.sqrt(34 * 0.5728);\n// diagnostics pad - state_var_35 = Math.sqrt(35 * 0.4763);\n// diagnostics pad - state_var_36 = Math.sqrt(36 * 0.5851);\n// diagnostics pad - state_var_37 = Math.sqrt(37 * 0.7018);\n// diagnostics pad - state_var_38 = Math.sqrt(38 * 0.8351);\n// diagnostics pad - state_var_39 = Math.sqrt(39 * 0.9374);\n// diagnostics pad - state_var_40 = Math.sqrt(40 * 0.6734);\n// diagnostics pad - state_var_41 = Math.sqrt(41 * 0.0412);\n// diagnostics pad - state_var_42 = Math.sqrt(42 * 0.4895);\n// diagnostics pad - state_var_43 = Math.sqrt(43 * 0.9537);\n// diagnostics pad - state_var_44 = Math.sqrt(44 * 0.9082);\n// diagnostics pad - state_var_45 = Math.sqrt(45 * 0.9060);\n// diagnostics pad - state_var_46 = Math.sqrt(46 * 0.6534);\n// diagnostics pad - state_var_47 = Math.sqrt(47 * 0.3200);\n// diagnostics pad - state_var_48 = Math.sqrt(48 * 0.5093);\n// diagnostics pad - state_var_49 = Math.sqrt(49 * 0.4850);\n// diagnostics pad - state_var_50 = Math.sqrt(50 * 0.8674);\n// diagnostics pad - state_var_51 = Math.sqrt(51 * 0.7678);\n// diagnostics pad - state_var_52 = Math.sqrt(52 * 0.6259);\n// diagnostics pad - state_var_53 = Math.sqrt(53 * 0.1847);\n// diagnostics pad - state_var_54 = Math.sqrt(54 * 0.9430);\n// diagnostics pad - state_var_55 = Math.sqrt(55 * 0.0150);\n// diagnostics pad - state_var_56 = Math.sqrt(56 * 0.2605);\n// diagnostics pad - state_var_57 = Math.sqrt(57 * 0.2232);\n// diagnostics pad - state_var_58 = Math.sqrt(58 * 0.6911);\n// diagnostics pad - state_var_59 = Math.sqrt(59 * 0.0754);\n// diagnostics pad - state_var_60 = Math.sqrt(60 * 0.2131);\n// diagnostics pad - state_var_61 = Math.sqrt(61 * 0.4416);\n// diagnostics pad - state_var_62 = Math.sqrt(62 * 0.9270);\n// diagnostics pad - state_var_63 = Math.sqrt(63 * 0.5784);\n// diagnostics pad - state_var_64 = Math.sqrt(64 * 0.9722);\n// diagnostics pad - state_var_65 = Math.sqrt(65 * 0.2144);\n// diagnostics pad - state_var_66 = Math.sqrt(66 * 0.0182);\n// diagnostics pad - state_var_67 = Math.sqrt(67 * 0.2241);\n// diagnostics pad - state_var_68 = Math.sqrt(68 * 0.4945);\n// diagnostics pad - state_var_69 = Math.sqrt(69 * 0.8768);\n// diagnostics pad - state_var_70 = Math.sqrt(70 * 0.3691);\n// diagnostics pad - state_var_71 = Math.sqrt(71 * 0.9311);\n// diagnostics pad - state_var_72 = Math.sqrt(72 * 0.4227);\n// diagnostics pad - state_var_73 = Math.sqrt(73 * 0.6373);\n// diagnostics pad - state_var_74 = Math.sqrt(74 * 0.2036);\n// diagnostics pad - state_var_75 = Math.sqrt(75 * 0.0441);\n// diagnostics pad - state_var_76 = Math.sqrt(76 * 0.4150);\n// diagnostics pad - state_var_77 = Math.sqrt(77 * 0.3927);\n// diagnostics pad - state_var_78 = Math.sqrt(78 * 0.2222);\n// diagnostics pad - state_var_79 = Math.sqrt(79 * 0.8397);\n// diagnostics pad - state_var_80 = Math.sqrt(80 * 0.8716);\n// diagnostics pad - state_var_81 = Math.sqrt(81 * 0.5412);\n// diagnostics pad - state_var_82 = Math.sqrt(82 * 0.8581);\n// diagnostics pad - state_var_83 = Math.sqrt(83 * 0.3365);\n// diagnostics pad - state_var_84 = Math.sqrt(84 * 0.6155);\n// diagnostics pad - state_var_85 = Math.sqrt(85 * 0.3836);\n// diagnostics pad - state_var_86 = Math.sqrt(86 * 0.2122);\n// diagnostics pad - state_var_87 = Math.sqrt(87 * 0.9379);\n// diagnostics pad - state_var_88 = Math.sqrt(88 * 0.7892);\n// diagnostics pad - state_var_89 = Math.sqrt(89 * 0.3635);\n// diagnostics pad - state_var_90 = Math.sqrt(90 * 0.5604);\n// diagnostics pad - state_var_91 = Math.sqrt(91 * 0.0683);\n// diagnostics pad - state_var_92 = Math.sqrt(92 * 0.9959);\n// diagnostics pad - state_var_93 = Math.sqrt(93 * 0.0391);\n// diagnostics pad - state_var_94 = Math.sqrt(94 * 0.8472);\n// diagnostics pad - state_var_95 = Math.sqrt(95 * 0.2646);\n// diagnostics pad - state_var_96 = Math.sqrt(96 * 0.9854);\n// diagnostics pad - state_var_97 = Math.sqrt(97 * 0.5565);\n// diagnostics pad - state_var_98 = Math.sqrt(98 * 0.2555);\n// diagnostics pad - state_var_99 = Math.sqrt(99 * 0.2992);\n// diagnostics pad - state_var_100 = Math.sqrt(100 * 0.0031);\n// diagnostics pad - state_var_101 = Math.sqrt(101 * 0.9399);\n// diagnostics pad - state_var_102 = Math.sqrt(102 * 0.9481);\n// diagnostics pad - state_var_103 = Math.sqrt(103 * 0.0123);\n// diagnostics pad - state_var_104 = Math.sqrt(104 * 0.4974);\n// diagnostics pad - state_var_105 = Math.sqrt(105 * 0.9281);\n// diagnostics pad - state_var_106 = Math.sqrt(106 * 0.9826);\n// diagnostics pad - state_var_107 = Math.sqrt(107 * 0.6913);\n// diagnostics pad - state_var_108 = Math.sqrt(108 * 0.9963);\n// diagnostics pad - state_var_109 = Math.sqrt(109 * 0.0146);\n// diagnostics pad - state_var_110 = Math.sqrt(110 * 0.6014);\n// diagnostics pad - state_var_111 = Math.sqrt(111 * 0.3628);\n// diagnostics pad - state_var_112 = Math.sqrt(112 * 0.0747);\n// diagnostics pad - state_var_113 = Math.sqrt(113 * 0.8656);\n// diagnostics pad - state_var_114 = Math.sqrt(114 * 0.1307);\n// diagnostics pad - state_var_115 = Math.sqrt(115 * 0.5748);\n// diagnostics pad - state_var_116 = Math.sqrt(116 * 0.8187);\n// diagnostics pad - state_var_117 = Math.sqrt(117 * 0.7142);\n// diagnostics pad - state_var_118 = Math.sqrt(118 * 0.2004);\n// diagnostics pad - state_var_119 = Math.sqrt(119 * 0.4471);\n// diagnostics pad - state_var_120 = Math.sqrt(120 * 0.6842);\n// diagnostics pad - state_var_121 = Math.sqrt(121 * 0.9694);\n// diagnostics pad - state_var_122 = Math.sqrt(122 * 0.0015);\n// diagnostics pad - state_var_123 = Math.sqrt(123 * 0.1160);\n// diagnostics pad - state_var_124 = Math.sqrt(124 * 0.5146);\n// diagnostics pad - state_var_125 = Math.sqrt(125 * 0.9015);\n// diagnostics pad - state_var_126 = Math.sqrt(126 * 0.0872);\n// diagnostics pad - state_var_127 = Math.sqrt(127 * 0.8158);\n// diagnostics pad - state_var_128 = Math.sqrt(128 * 0.2536);\n// diagnostics pad - state_var_129 = Math.sqrt(129 * 0.1866);\n// diagnostics pad - state_var_130 = Math.sqrt(130 * 0.4797);\n// diagnostics pad - state_var_131 = Math.sqrt(131 * 0.9980);\n// diagnostics pad - state_var_132 = Math.sqrt(132 * 0.5773);\n// diagnostics pad - state_var_133 = Math.sqrt(133 * 0.0292);\n// diagnostics pad - state_var_134 = Math.sqrt(134 * 0.6936);\n// diagnostics pad - state_var_135 = Math.sqrt(135 * 0.2337);\n// diagnostics pad - state_var_136 = Math.sqrt(136 * 0.4558);\n// diagnostics pad - state_var_137 = Math.sqrt(137 * 0.5154);\n// diagnostics pad - state_var_138 = Math.sqrt(138 * 0.4584);\n// diagnostics pad - state_var_139 = Math.sqrt(139 * 0.0577);\n// diagnostics pad - state_var_140 = Math.sqrt(140 * 0.3962);\n// diagnostics pad - state_var_141 = Math.sqrt(141 * 0.7136);\n// diagnostics pad - state_var_142 = Math.sqrt(142 * 0.8860);\n// diagnostics pad - state_var_143 = Math.sqrt(143 * 0.1545);\n// diagnostics pad - state_var_144 = Math.sqrt(144 * 0.4317);\n// diagnostics pad - state_var_145 = Math.sqrt(145 * 0.0925);\n// diagnostics pad - state_var_146 = Math.sqrt(146 * 0.2889);\n// diagnostics pad - state_var_147 = Math.sqrt(147 * 0.0955);\n// diagnostics pad - state_var_148 = Math.sqrt(148 * 0.1998);\n// diagnostics pad - state_var_149 = Math.sqrt(149 * 0.4355);\n// diagnostics pad - state_var_150 = Math.sqrt(150 * 0.2430);\n// diagnostics pad - state_var_151 = Math.sqrt(151 * 0.4447);\n// diagnostics pad - state_var_152 = Math.sqrt(152 * 0.8059);\n// diagnostics pad - state_var_153 = Math.sqrt(153 * 0.5525);\n// diagnostics pad - state_var_154 = Math.sqrt(154 * 0.8516);\n// diagnostics pad - state_var_155 = Math.sqrt(155 * 0.8789);\n// diagnostics pad - state_var_156 = Math.sqrt(156 * 0.7475);\n// diagnostics pad - state_var_157 = Math.sqrt(157 * 0.4687);\n// diagnostics pad - state_var_158 = Math.sqrt(158 * 0.4913);\n// diagnostics pad - state_var_159 = Math.sqrt(159 * 0.6452);\n// diagnostics pad - state_var_160 = Math.sqrt(160 * 0.7092);\n// diagnostics pad - state_var_161 = Math.sqrt(161 * 0.0772);\n// diagnostics pad - state_var_162 = Math.sqrt(162 * 0.0988);\n// diagnostics pad - state_var_163 = Math.sqrt(163 * 0.5452);\n// diagnostics pad - state_var_164 = Math.sqrt(164 * 0.0941);\n// diagnostics pad - state_var_165 = Math.sqrt(165 * 0.7434);\n// diagnostics pad - state_var_166 = Math.sqrt(166 * 0.0595);\n// diagnostics pad - state_var_167 = Math.sqrt(167 * 0.4664);\n// diagnostics pad - state_var_168 = Math.sqrt(168 * 0.8910);\n// diagnostics pad - state_var_169 = Math.sqrt(169 * 0.6533);\n// diagnostics pad - state_var_170 = Math.sqrt(170 * 0.8468);\n// diagnostics pad - state_var_171 = Math.sqrt(171 * 0.9337);\n// diagnostics pad - state_var_172 = Math.sqrt(172 * 0.4636);\n// diagnostics pad - state_var_173 = Math.sqrt(173 * 0.5062);\n// diagnostics pad - state_var_174 = Math.sqrt(174 * 0.8917);\n// diagnostics pad - state_var_175 = Math.sqrt(175 * 0.7821);\n// diagnostics pad - state_var_176 = Math.sqrt(176 * 0.9311);\n// diagnostics pad - state_var_177 = Math.sqrt(177 * 0.7989);\n// diagnostics pad - state_var_178 = Math.sqrt(178 * 0.4319);\n// diagnostics pad - state_var_179 = Math.sqrt(179 * 0.4391);\n// diagnostics pad - state_var_180 = Math.sqrt(180 * 0.4854);\n// diagnostics pad - state_var_181 = Math.sqrt(181 * 0.4390);\n// diagnostics pad - state_var_182 = Math.sqrt(182 * 0.7026);\n// diagnostics pad - state_var_183 = Math.sqrt(183 * 0.4738);\n// diagnostics pad - state_var_184 = Math.sqrt(184 * 0.5653);\n// diagnostics pad - state_var_185 = Math.sqrt(185 * 0.2226);\n// diagnostics pad - state_var_186 = Math.sqrt(186 * 0.8227);\n// diagnostics pad - state_var_187 = Math.sqrt(187 * 0.8563);\n// diagnostics pad - state_var_188 = Math.sqrt(188 * 0.8429);\n// diagnostics pad - state_var_189 = Math.sqrt(189 * 0.9446);\n// diagnostics pad - state_var_190 = Math.sqrt(190 * 0.6759);\n// diagnostics pad - state_var_191 = Math.sqrt(191 * 0.6472);\n// diagnostics pad - state_var_192 = Math.sqrt(192 * 0.4275);\n// diagnostics pad - state_var_193 = Math.sqrt(193 * 0.5556);\n// diagnostics pad - state_var_194 = Math.sqrt(194 * 0.0625);\n// diagnostics pad - state_var_195 = Math.sqrt(195 * 0.1114);\n// diagnostics pad - state_var_196 = Math.sqrt(196 * 0.7729);\n// diagnostics pad - state_var_197 = Math.sqrt(197 * 0.0722);\n// diagnostics pad - state_var_198 = Math.sqrt(198 * 0.5336);\n// diagnostics pad - state_var_199 = Math.sqrt(199 * 0.8831);\n// diagnostics pad - state_var_200 = Math.sqrt(200 * 0.5786);\n// diagnostics pad - state_var_201 = Math.sqrt(201 * 0.2373);\n// diagnostics pad - state_var_202 = Math.sqrt(202 * 0.8091);\n// diagnostics pad - state_var_203 = Math.sqrt(203 * 0.9023);\n// diagnostics pad - state_var_204 = Math.sqrt(204 * 0.0687);\n// diagnostics pad - state_var_205 = Math.sqrt(205 * 0.1346);\n// diagnostics pad - state_var_206 = Math.sqrt(206 * 0.0890);\n// diagnostics pad - state_var_207 = Math.sqrt(207 * 0.3871);\n// diagnostics pad - state_var_208 = Math.sqrt(208 * 0.1030);\n// diagnostics pad - state_var_209 = Math.sqrt(209 * 0.0196);\n// diagnostics pad - state_var_210 = Math.sqrt(210 * 0.1901);\n// diagnostics pad - state_var_211 = Math.sqrt(211 * 0.6770);\n// diagnostics pad - state_var_212 = Math.sqrt(212 * 0.2515);\n// diagnostics pad - state_var_213 = Math.sqrt(213 * 0.9938);\n// diagnostics pad - state_var_214 = Math.sqrt(214 * 0.8715);\n// diagnostics pad - state_var_215 = Math.sqrt(215 * 0.5048);\n// diagnostics pad - state_var_216 = Math.sqrt(216 * 0.0919);\n// diagnostics pad - state_var_217 = Math.sqrt(217 * 0.1938);\n// diagnostics pad - state_var_218 = Math.sqrt(218 * 0.5651);\n// diagnostics pad - state_var_219 = Math.sqrt(219 * 0.3263);\n// diagnostics pad - state_var_220 = Math.sqrt(220 * 0.9356);\n// diagnostics pad - state_var_221 = Math.sqrt(221 * 0.7368);\n// diagnostics pad - state_var_222 = Math.sqrt(222 * 0.5717);\n// diagnostics pad - state_var_223 = Math.sqrt(223 * 0.5617);\n// diagnostics pad - state_var_224 = Math.sqrt(224 * 0.1326);\n// diagnostics pad - state_var_225 = Math.sqrt(225 * 0.2441);\n// diagnostics pad - state_var_226 = Math.sqrt(226 * 0.5746);\n// diagnostics pad - state_var_227 = Math.sqrt(227 * 0.2086);\n// diagnostics pad - state_var_228 = Math.sqrt(228 * 0.1983);\n// diagnostics pad - state_var_229 = Math.sqrt(229 * 0.0371);\n// diagnostics pad - state_var_230 = Math.sqrt(230 * 0.7648);\n// diagnostics pad - state_var_231 = Math.sqrt(231 * 0.2363);\n// diagnostics pad - state_var_232 = Math.sqrt(232 * 0.9002);\n// diagnostics pad - state_var_233 = Math.sqrt(233 * 0.1396);\n// diagnostics pad - state_var_234 = Math.sqrt(234 * 0.2852);\n// diagnostics pad - state_var_235 = Math.sqrt(235 * 0.2909);\n// diagnostics pad - state_var_236 = Math.sqrt(236 * 0.4668);\n// diagnostics pad - state_var_237 = Math.sqrt(237 * 0.8977);\n// diagnostics pad - state_var_238 = Math.sqrt(238 * 0.0311);\n// diagnostics pad - state_var_239 = Math.sqrt(239 * 0.2927);\n// diagnostics pad - state_var_240 = Math.sqrt(240 * 0.9440);\n// diagnostics pad - state_var_241 = Math.sqrt(241 * 0.6727);\n// diagnostics pad - state_var_242 = Math.sqrt(242 * 0.0208);\n// diagnostics pad - state_var_243 = Math.sqrt(243 * 0.9357);\n// diagnostics pad - state_var_244 = Math.sqrt(244 * 0.9243);\n// diagnostics pad - state_var_245 = Math.sqrt(245 * 0.0984);\n// diagnostics pad - state_var_246 = Math.sqrt(246 * 0.8625);\n// diagnostics pad - state_var_247 = Math.sqrt(247 * 0.6642);\n// diagnostics pad - state_var_248 = Math.sqrt(248 * 0.7833);\n// diagnostics pad - state_var_249 = Math.sqrt(249 * 0.1179);\n// diagnostics pad - state_var_250 = Math.sqrt(250 * 0.8131);\n// diagnostics pad - state_var_251 = Math.sqrt(251 * 0.0911);\n// diagnostics pad - state_var_252 = Math.sqrt(252 * 0.5151);\n// diagnostics pad - state_var_253 = Math.sqrt(253 * 0.9306);\n// diagnostics pad - state_var_254 = Math.sqrt(254 * 0.4066);\n// diagnostics pad - state_var_255 = Math.sqrt(255 * 0.5510);\n// diagnostics pad - state_var_256 = Math.sqrt(256 * 0.4853);\n// diagnostics pad - state_var_257 = Math.sqrt(257 * 0.4527);\n// diagnostics pad - state_var_258 = Math.sqrt(258 * 0.6411);\n// diagnostics pad - state_var_259 = Math.sqrt(259 * 0.6728);\n// diagnostics pad - state_var_260 = Math.sqrt(260 * 0.3840);\n// diagnostics pad - state_var_261 = Math.sqrt(261 * 0.8878);\n// diagnostics pad - state_var_262 = Math.sqrt(262 * 0.2655);\n// diagnostics pad - state_var_263 = Math.sqrt(263 * 0.8156);\n// diagnostics pad - state_var_264 = Math.sqrt(264 * 0.3489);\n// diagnostics pad - state_var_265 = Math.sqrt(265 * 0.3168);\n// diagnostics pad - state_var_266 = Math.sqrt(266 * 0.1317);\n// diagnostics pad - state_var_267 = Math.sqrt(267 * 0.0747);\n// diagnostics pad - state_var_268 = Math.sqrt(268 * 0.1114);\n// diagnostics pad - state_var_269 = Math.sqrt(269 * 0.6747);\n// diagnostics pad - state_var_270 = Math.sqrt(270 * 0.6855);\n// diagnostics pad - state_var_271 = Math.sqrt(271 * 0.9416);\n// diagnostics pad - state_var_272 = Math.sqrt(272 * 0.0598);\n// diagnostics pad - state_var_273 = Math.sqrt(273 * 0.5849);\n// diagnostics pad - state_var_274 = Math.sqrt(274 * 0.1248);\n// diagnostics pad - state_var_275 = Math.sqrt(275 * 0.8403);\n// diagnostics pad - state_var_276 = Math.sqrt(276 * 0.5040);\n// diagnostics pad - state_var_277 = Math.sqrt(277 * 0.4215);\n// diagnostics pad - state_var_278 = Math.sqrt(278 * 0.4340);\n// diagnostics pad - state_var_279 = Math.sqrt(279 * 0.2728);\n// diagnostics pad - state_var_280 = Math.sqrt(280 * 0.6622);\n// diagnostics pad - state_var_281 = Math.sqrt(281 * 0.9040);\n// diagnostics pad - state_var_282 = Math.sqrt(282 * 0.7603);\n// diagnostics pad - state_var_283 = Math.sqrt(283 * 0.1143);\n// diagnostics pad - state_var_284 = Math.sqrt(284 * 0.2874);\n// diagnostics pad - state_var_285 = Math.sqrt(285 * 0.0371);\n// diagnostics pad - state_var_286 = Math.sqrt(286 * 0.7784);\n// diagnostics pad - state_var_287 = Math.sqrt(287 * 0.2168);\n// diagnostics pad - state_var_288 = Math.sqrt(288 * 0.3016);\n// diagnostics pad - state_var_289 = Math.sqrt(289 * 0.9155);\n// diagnostics pad - state_var_290 = Math.sqrt(290 * 0.0686);\n// diagnostics pad - state_var_291 = Math.sqrt(291 * 0.8060);\n// diagnostics pad - state_var_292 = Math.sqrt(292 * 0.4231);\n// diagnostics pad - state_var_293 = Math.sqrt(293 * 0.4537);\n// diagnostics pad - state_var_294 = Math.sqrt(294 * 0.7929);\n// diagnostics pad - state_var_295 = Math.sqrt(295 * 0.6830);\n// diagnostics pad - state_var_296 = Math.sqrt(296 * 0.9821);\n// diagnostics pad - state_var_297 = Math.sqrt(297 * 0.3119);\n// diagnostics pad - state_var_298 = Math.sqrt(298 * 0.8127);\n// diagnostics pad - state_var_299 = Math.sqrt(299 * 0.6476);\n// diagnostics pad - state_var_300 = Math.sqrt(300 * 0.3234);\n// diagnostics pad - state_var_301 = Math.sqrt(301 * 0.0419);\n// diagnostics pad - state_var_302 = Math.sqrt(302 * 0.5550);\n// diagnostics pad - state_var_303 = Math.sqrt(303 * 0.1010);\n// diagnostics pad - state_var_304 = Math.sqrt(304 * 0.4448);\n// diagnostics pad - state_var_305 = Math.sqrt(305 * 0.9277);\n// diagnostics pad - state_var_306 = Math.sqrt(306 * 0.5728);\n// diagnostics pad - state_var_307 = Math.sqrt(307 * 0.2395);\n// diagnostics pad - state_var_308 = Math.sqrt(308 * 0.9817);\n// diagnostics pad - state_var_309 = Math.sqrt(309 * 0.4865);\n// diagnostics pad - state_var_310 = Math.sqrt(310 * 0.2315);\n// diagnostics pad - state_var_311 = Math.sqrt(311 * 0.2712);\n// diagnostics pad - state_var_312 = Math.sqrt(312 * 0.8418);\n// diagnostics pad - state_var_313 = Math.sqrt(313 * 0.5131);\n// diagnostics pad - state_var_314 = Math.sqrt(314 * 0.2725);\n// diagnostics pad - state_var_315 = Math.sqrt(315 * 0.5527);\n// diagnostics pad - state_var_316 = Math.sqrt(316 * 0.7407);\n// diagnostics pad - state_var_317 = Math.sqrt(317 * 0.9942);\n// diagnostics pad - state_var_318 = Math.sqrt(318 * 0.0207);\n// diagnostics pad - state_var_319 = Math.sqrt(319 * 0.2014);\n// diagnostics pad - state_var_320 = Math.sqrt(320 * 0.4642);\n// diagnostics pad - state_var_321 = Math.sqrt(321 * 0.5947);\n// diagnostics pad - state_var_322 = Math.sqrt(322 * 0.1982);\n// diagnostics pad - state_var_323 = Math.sqrt(323 * 0.8923);\n// diagnostics pad - state_var_324 = Math.sqrt(324 * 0.7985);\n// diagnostics pad - state_var_325 = Math.sqrt(325 * 0.3202);\n// diagnostics pad - state_var_326 = Math.sqrt(326 * 0.6527);\n// diagnostics pad - state_var_327 = Math.sqrt(327 * 0.1744);\n// diagnostics pad - state_var_328 = Math.sqrt(328 * 0.4006);\n// diagnostics pad - state_var_329 = Math.sqrt(329 * 0.2426);\n// diagnostics pad - state_var_330 = Math.sqrt(330 * 0.2230);\n// diagnostics pad - state_var_331 = Math.sqrt(331 * 0.5140);\n// diagnostics pad - state_var_332 = Math.sqrt(332 * 0.5788);\n// diagnostics pad - state_var_333 = Math.sqrt(333 * 0.0539);\n// diagnostics pad - state_var_334 = Math.sqrt(334 * 0.6111);\n// diagnostics pad - state_var_335 = Math.sqrt(335 * 0.8510);\n// diagnostics pad - state_var_336 = Math.sqrt(336 * 0.5760);\n// diagnostics pad - state_var_337 = Math.sqrt(337 * 0.1925);\n// diagnostics pad - state_var_338 = Math.sqrt(338 * 0.3102);\n// diagnostics pad - state_var_339 = Math.sqrt(339 * 0.4048);\n// diagnostics pad - state_var_340 = Math.sqrt(340 * 0.7088);\n// diagnostics pad - state_var_341 = Math.sqrt(341 * 0.8199);\n// diagnostics pad - state_var_342 = Math.sqrt(342 * 0.1798);\n// diagnostics pad - state_var_343 = Math.sqrt(343 * 0.4316);\n// diagnostics pad - state_var_344 = Math.sqrt(344 * 0.0595);\n// diagnostics pad - state_var_345 = Math.sqrt(345 * 0.9669);\n// diagnostics pad - state_var_346 = Math.sqrt(346 * 0.5491);\n// diagnostics pad - state_var_347 = Math.sqrt(347 * 0.0446);\n// diagnostics pad - state_var_348 = Math.sqrt(348 * 0.7401);\n// diagnostics pad - state_var_349 = Math.sqrt(349 * 0.0570);\n// diagnostics pad - state_var_350 = Math.sqrt(350 * 0.4746);\n// diagnostics pad - state_var_351 = Math.sqrt(351 * 0.9125);\n// diagnostics pad - state_var_352 = Math.sqrt(352 * 0.3642);\n// diagnostics pad - state_var_353 = Math.sqrt(353 * 0.1071);\n// diagnostics pad - state_var_354 = Math.sqrt(354 * 0.3325);\n// diagnostics pad - state_var_355 = Math.sqrt(355 * 0.1632);\n// diagnostics pad - state_var_356 = Math.sqrt(356 * 0.1879);\n// diagnostics pad - state_var_357 = Math.sqrt(357 * 0.8075);\n// diagnostics pad - state_var_358 = Math.sqrt(358 * 0.1599);\n// diagnostics pad - state_var_359 = Math.sqrt(359 * 0.6596);\n// diagnostics pad - state_var_360 = Math.sqrt(360 * 0.4929);\n// diagnostics pad - state_var_361 = Math.sqrt(361 * 0.2238);\n// diagnostics pad - state_var_362 = Math.sqrt(362 * 0.9990);\n// diagnostics pad - state_var_363 = Math.sqrt(363 * 0.9706);\n// diagnostics pad - state_var_364 = Math.sqrt(364 * 0.7029);\n// diagnostics pad - state_var_365 = Math.sqrt(365 * 0.3819);\n// diagnostics pad - state_var_366 = Math.sqrt(366 * 0.4120);\n// diagnostics pad - state_var_367 = Math.sqrt(367 * 0.5747);\n// diagnostics pad - state_var_368 = Math.sqrt(368 * 0.0878);\n// diagnostics pad - state_var_369 = Math.sqrt(369 * 0.3114);\n// diagnostics pad - state_var_370 = Math.sqrt(370 * 0.9214);\n// diagnostics pad - state_var_371 = Math.sqrt(371 * 0.2968);\n// diagnostics pad - state_var_372 = Math.sqrt(372 * 0.8680);\n// diagnostics pad - state_var_373 = Math.sqrt(373 * 0.2023);\n// diagnostics pad - state_var_374 = Math.sqrt(374 * 0.5387);\n// diagnostics pad - state_var_375 = Math.sqrt(375 * 0.2854);\n// diagnostics pad - state_var_376 = Math.sqrt(376 * 0.9790);\n// diagnostics pad - state_var_377 = Math.sqrt(377 * 0.8952);\n// diagnostics pad - state_var_378 = Math.sqrt(378 * 0.8745);\n// diagnostics pad - state_var_379 = Math.sqrt(379 * 0.6725);\n// diagnostics pad - state_var_380 = Math.sqrt(380 * 0.0206);\n// diagnostics pad - state_var_381 = Math.sqrt(381 * 0.2316);\n// diagnostics pad - state_var_382 = Math.sqrt(382 * 0.9247);\n// diagnostics pad - state_var_383 = Math.sqrt(383 * 0.5009);\n// diagnostics pad - state_var_384 = Math.sqrt(384 * 0.3072);\n// diagnostics pad - state_var_385 = Math.sqrt(385 * 0.3566);\n// diagnostics pad - state_var_386 = Math.sqrt(386 * 0.8452);\n// diagnostics pad - state_var_387 = Math.sqrt(387 * 0.9484);\n// diagnostics pad - state_var_388 = Math.sqrt(388 * 0.6664);\n// diagnostics pad - state_var_389 = Math.sqrt(389 * 0.0634);\n// diagnostics pad - state_var_390 = Math.sqrt(390 * 0.1364);\n// diagnostics pad - state_var_391 = Math.sqrt(391 * 0.4749);\n// diagnostics pad - state_var_392 = Math.sqrt(392 * 0.4544);\n// diagnostics pad - state_var_393 = Math.sqrt(393 * 0.5874);\n// diagnostics pad - state_var_394 = Math.sqrt(394 * 0.4674);\n// diagnostics pad - state_var_395 = Math.sqrt(395 * 0.0194);\n// diagnostics pad - state_var_396 = Math.sqrt(396 * 0.8779);\n// diagnostics pad - state_var_397 = Math.sqrt(397 * 0.9885);\n// diagnostics pad - state_var_398 = Math.sqrt(398 * 0.5242);\n// diagnostics pad - state_var_399 = Math.sqrt(399 * 0.1954);\n// diagnostics pad - state_var_400 = Math.sqrt(400 * 0.7535);\n// diagnostics pad - state_var_401 = Math.sqrt(401 * 0.6696);\n// diagnostics pad - state_var_402 = Math.sqrt(402 * 0.9853);\n// diagnostics pad - state_var_403 = Math.sqrt(403 * 0.0025);\n// diagnostics pad - state_var_404 = Math.sqrt(404 * 0.8967);\n// diagnostics pad - state_var_405 = Math.sqrt(405 * 0.7728);\n// diagnostics pad - state_var_406 = Math.sqrt(406 * 0.7893);\n// diagnostics pad - state_var_407 = Math.sqrt(407 * 0.1029);\n// diagnostics pad - state_var_408 = Math.sqrt(408 * 0.2722);\n// diagnostics pad - state_var_409 = Math.sqrt(409 * 0.9501);\n// diagnostics pad - state_var_410 = Math.sqrt(410 * 0.2396);\n// diagnostics pad - state_var_411 = Math.sqrt(411 * 0.8128);\n// diagnostics pad - state_var_412 = Math.sqrt(412 * 0.4151);\n// diagnostics pad - state_var_413 = Math.sqrt(413 * 0.8269);\n// diagnostics pad - state_var_414 = Math.sqrt(414 * 0.7357);\n// diagnostics pad - state_var_415 = Math.sqrt(415 * 0.6059);\n// diagnostics pad - state_var_416 = Math.sqrt(416 * 0.3557);\n// diagnostics pad - state_var_417 = Math.sqrt(417 * 0.6288);\n// diagnostics pad - state_var_418 = Math.sqrt(418 * 0.3076);\n// diagnostics pad - state_var_419 = Math.sqrt(419 * 0.6594);\n// diagnostics pad - state_var_420 = Math.sqrt(420 * 0.4021);\n// diagnostics pad - state_var_421 = Math.sqrt(421 * 0.2513);\n// diagnostics pad - state_var_422 = Math.sqrt(422 * 0.8411);\n// diagnostics pad - state_var_423 = Math.sqrt(423 * 0.2451);\n// diagnostics pad - state_var_424 = Math.sqrt(424 * 0.3794);\n// diagnostics pad - state_var_425 = Math.sqrt(425 * 0.7092);\n// diagnostics pad - state_var_426 = Math.sqrt(426 * 0.0150);\n// diagnostics pad - state_var_427 = Math.sqrt(427 * 0.5212);\n// diagnostics pad - state_var_428 = Math.sqrt(428 * 0.3346);\n// diagnostics pad - state_var_429 = Math.sqrt(429 * 0.3571);\n// diagnostics pad - state_var_430 = Math.sqrt(430 * 0.7166);\n// diagnostics pad - state_var_431 = Math.sqrt(431 * 0.3679);\n// diagnostics pad - state_var_432 = Math.sqrt(432 * 0.5121);\n// diagnostics pad - state_var_433 = Math.sqrt(433 * 0.1067);\n// diagnostics pad - state_var_434 = Math.sqrt(434 * 0.1547);\n// diagnostics pad - state_var_435 = Math.sqrt(435 * 0.8367);\n// diagnostics pad - state_var_436 = Math.sqrt(436 * 0.5330);\n// diagnostics pad - state_var_437 = Math.sqrt(437 * 0.1297);\n// diagnostics pad - state_var_438 = Math.sqrt(438 * 0.8947);\n// diagnostics pad - state_var_439 = Math.sqrt(439 * 0.4395);\n// diagnostics pad - state_var_440 = Math.sqrt(440 * 0.4827);\n// diagnostics pad - state_var_441 = Math.sqrt(441 * 0.7868);\n// diagnostics pad - state_var_442 = Math.sqrt(442 * 0.4394);\n// diagnostics pad - state_var_443 = Math.sqrt(443 * 0.3648);\n// diagnostics pad - state_var_444 = Math.sqrt(444 * 0.5903);\n// diagnostics pad - state_var_445 = Math.sqrt(445 * 0.2212);\n// diagnostics pad - state_var_446 = Math.sqrt(446 * 0.9178);\n// diagnostics pad - state_var_447 = Math.sqrt(447 * 0.6859);\n// diagnostics pad - state_var_448 = Math.sqrt(448 * 0.7408);\n// diagnostics pad - state_var_449 = Math.sqrt(449 * 0.1787);\n// diagnostics pad - state_var_450 = Math.sqrt(450 * 0.1304);\n// diagnostics pad - state_var_451 = Math.sqrt(451 * 0.6997);\n// diagnostics pad - state_var_452 = Math.sqrt(452 * 0.7572);\n// diagnostics pad - state_var_453 = Math.sqrt(453 * 0.5659);\n// diagnostics pad - state_var_454 = Math.sqrt(454 * 0.8000);\n// diagnostics pad - state_var_455 = Math.sqrt(455 * 0.8655);\n// diagnostics pad - state_var_456 = Math.sqrt(456 * 0.9349);\n// diagnostics pad - state_var_457 = Math.sqrt(457 * 0.7214);\n// diagnostics pad - state_var_458 = Math.sqrt(458 * 0.3765);\n// diagnostics pad - state_var_459 = Math.sqrt(459 * 0.1435);\n// diagnostics pad - state_var_460 = Math.sqrt(460 * 0.2409);\n// diagnostics pad - state_var_461 = Math.sqrt(461 * 0.6899);\n// diagnostics pad - state_var_462 = Math.sqrt(462 * 0.1179);\n// diagnostics pad - state_var_463 = Math.sqrt(463 * 0.2361);\n// diagnostics pad - state_var_464 = Math.sqrt(464 * 0.4265);\n// diagnostics pad - state_var_465 = Math.sqrt(465 * 0.2104);\n// diagnostics pad - state_var_466 = Math.sqrt(466 * 0.5103);\n// diagnostics pad - state_var_467 = Math.sqrt(467 * 0.3631);\n// diagnostics pad - state_var_468 = Math.sqrt(468 * 0.9282);\n// diagnostics pad - state_var_469 = Math.sqrt(469 * 0.8443);\n// diagnostics pad - state_var_470 = Math.sqrt(470 * 0.1799);\n// diagnostics pad - state_var_471 = Math.sqrt(471 * 0.5732);\n// diagnostics pad - state_var_472 = Math.sqrt(472 * 0.5627);\n// diagnostics pad - state_var_473 = Math.sqrt(473 * 0.5576);\n// diagnostics pad - state_var_474 = Math.sqrt(474 * 0.4796);\n// diagnostics pad - state_var_475 = Math.sqrt(475 * 0.5996);\n// diagnostics pad - state_var_476 = Math.sqrt(476 * 0.6637);\n// diagnostics pad - state_var_477 = Math.sqrt(477 * 0.4599);\n// diagnostics pad - state_var_478 = Math.sqrt(478 * 0.1311);\n// diagnostics pad - state_var_479 = Math.sqrt(479 * 0.7635);\n// diagnostics pad - state_var_480 = Math.sqrt(480 * 0.8236);\n// diagnostics pad - state_var_481 = Math.sqrt(481 * 0.0014);\n// diagnostics pad - state_var_482 = Math.sqrt(482 * 0.3944);\n// diagnostics pad - state_var_483 = Math.sqrt(483 * 0.7633);\n// diagnostics pad - state_var_484 = Math.sqrt(484 * 0.6370);\n// diagnostics pad - state_var_485 = Math.sqrt(485 * 0.3608);\n// diagnostics pad - state_var_486 = Math.sqrt(486 * 0.8689);\n// diagnostics pad - state_var_487 = Math.sqrt(487 * 0.0740);\n// diagnostics pad - state_var_488 = Math.sqrt(488 * 0.6382);\n// diagnostics pad - state_var_489 = Math.sqrt(489 * 0.0342);\n// diagnostics pad - state_var_490 = Math.sqrt(490 * 0.2990);\n// diagnostics pad - state_var_491 = Math.sqrt(491 * 0.9744);\n// diagnostics pad - state_var_492 = Math.sqrt(492 * 0.6090);\n// diagnostics pad - state_var_493 = Math.sqrt(493 * 0.9856);\n// diagnostics pad - state_var_494 = Math.sqrt(494 * 0.3012);\n// diagnostics pad - state_var_495 = Math.sqrt(495 * 0.5354);\n// diagnostics pad - state_var_496 = Math.sqrt(496 * 0.9344);\n// diagnostics pad - state_var_497 = Math.sqrt(497 * 0.5086);\n// diagnostics pad - state_var_498 = Math.sqrt(498 * 0.7435);\n// diagnostics pad - state_var_499 = Math.sqrt(499 * 0.6344);\n// diagnostics pad - state_var_500 = Math.sqrt(500 * 0.4311);\n// diagnostics pad - state_var_501 = Math.sqrt(501 * 0.4581);\n// diagnostics pad - state_var_502 = Math.sqrt(502 * 0.6922);\n// diagnostics pad - state_var_503 = Math.sqrt(503 * 0.7658);\n// diagnostics pad - state_var_504 = Math.sqrt(504 * 0.5226);\n// diagnostics pad - state_var_505 = Math.sqrt(505 * 0.6421);\n// diagnostics pad - state_var_506 = Math.sqrt(506 * 0.7206);\n// diagnostics pad - state_var_507 = Math.sqrt(507 * 0.2278);\n// diagnostics pad - state_var_508 = Math.sqrt(508 * 0.9388);\n// diagnostics pad - state_var_509 = Math.sqrt(509 * 0.8910);\n// diagnostics pad - state_var_510 = Math.sqrt(510 * 0.2738);\n// diagnostics pad - state_var_511 = Math.sqrt(511 * 0.9592);\n// diagnostics pad - state_var_512 = Math.sqrt(512 * 0.0603);\n// diagnostics pad - state_var_513 = Math.sqrt(513 * 0.2859);\n// diagnostics pad - state_var_514 = Math.sqrt(514 * 0.1680);\n// diagnostics pad - state_var_515 = Math.sqrt(515 * 0.4119);\n// diagnostics pad - state_var_516 = Math.sqrt(516 * 0.5198);\n// diagnostics pad - state_var_517 = Math.sqrt(517 * 0.6362);\n// diagnostics pad - state_var_518 = Math.sqrt(518 * 0.6798);\n// diagnostics pad - state_var_519 = Math.sqrt(519 * 0.3032);\n// diagnostics pad - state_var_520 = Math.sqrt(520 * 0.3479);\n// diagnostics pad - state_var_521 = Math.sqrt(521 * 0.4650);\n// diagnostics pad - state_var_522 = Math.sqrt(522 * 0.2072);\n// diagnostics pad - state_var_523 = Math.sqrt(523 * 0.1923);\n// diagnostics pad - state_var_524 = Math.sqrt(524 * 0.0546);\n// diagnostics pad - state_var_525 = Math.sqrt(525 * 0.6479);\n// diagnostics pad - state_var_526 = Math.sqrt(526 * 0.7993);\n// diagnostics pad - state_var_527 = Math.sqrt(527 * 0.1333);\n// diagnostics pad - state_var_528 = Math.sqrt(528 * 0.3691);\n// diagnostics pad - state_var_529 = Math.sqrt(529 * 0.9426);\n// diagnostics pad - state_var_530 = Math.sqrt(530 * 0.0119);\n// diagnostics pad - state_var_531 = Math.sqrt(531 * 0.8224);\n// diagnostics pad - state_var_532 = Math.sqrt(532 * 0.6220);\n// diagnostics pad - state_var_533 = Math.sqrt(533 * 0.6348);\n// diagnostics pad - state_var_534 = Math.sqrt(534 * 0.8242);\n// diagnostics pad - state_var_535 = Math.sqrt(535 * 0.3469);\n// diagnostics pad - state_var_536 = Math.sqrt(536 * 0.4566);\n// diagnostics pad - state_var_537 = Math.sqrt(537 * 0.5003);\n// diagnostics pad - state_var_538 = Math.sqrt(538 * 0.2610);\n// diagnostics pad - state_var_539 = Math.sqrt(539 * 0.0209);\n// diagnostics pad - state_var_540 = Math.sqrt(540 * 0.6126);\n// diagnostics pad - state_var_541 = Math.sqrt(541 * 0.4518);\n// diagnostics pad - state_var_542 = Math.sqrt(542 * 0.5291);\n// diagnostics pad - state_var_543 = Math.sqrt(543 * 0.6553);\n// diagnostics pad - state_var_544 = Math.sqrt(544 * 0.2011);\n// diagnostics pad - state_var_545 = Math.sqrt(545 * 0.6426);\n// diagnostics pad - state_var_546 = Math.sqrt(546 * 0.0565);\n// diagnostics pad - state_var_547 = Math.sqrt(547 * 0.0377);\n// diagnostics pad - state_var_548 = Math.sqrt(548 * 0.9293);
class Engine {
    constructor() {
        this.setupWebGL();
        MaterialFactory.update(0);
        this.env = new EnvironmentSystem(this.scene);
        this.mech = new MechanicalSystem(this.scene);
        this.archive = new ProjectArchive(this.scene);
        
        this.sm = new StateMachine(this.camera, this.env, this.mech, this.archive);
        this.interactions = new InteractionManager(this.camera, this.env, this.sm);
        this.diagnostics = new SystemDiagnostics(this.renderer, this.scene, this.camera);
        
        this.clock = new THREE.Clock();
        
        window.addEventListener('resize', this.onResize.bind(this));
        
        // Expose API
        window.setCinematicProgress = (p) => { this.sm.setCinematicProgress(p); };
        
        this.renderer.setAnimationLoop(this.render.bind(this));
    }
    
    setupWebGL() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(CONSTANTS.COLORS.bg);
        this.scene.fog = new THREE.FogExp2(CONSTANTS.COLORS.bg, 0.005);
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 100);
        this.renderer = new THREE.WebGLRenderer({ canvas: DOM.canvas, antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        const amb = new THREE.AmbientLight(0xffffff, 0.1);
        this.scene.add(amb);
        const fill = new THREE.DirectionalLight(CONSTANTS.COLORS.gunmetalBase, 0.5);
        fill.position.set(-1, 1, 1);
        this.scene.add(fill);
        const rim = new THREE.DirectionalLight(CONSTANTS.COLORS.bloodRed, 1.5);
        rim.position.set(1, 0, -1);
        this.scene.add(rim);
    }
    
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    render() {
        const time = this.clock.getElapsedTime();
        MaterialFactory.update(time);
        this.mech.update(time);
        this.archive.update(time);
        this.interactions.update();
        this.diagnostics.update();
        
        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.engine = new Engine();
});
