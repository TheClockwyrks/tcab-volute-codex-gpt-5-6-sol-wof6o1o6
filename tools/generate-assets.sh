#!/usr/bin/env bash
set -euo pipefail

# One-time authoring script. The game build never invokes this file.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/public/assets"
WORK="$ROOT/.asset-work"
mkdir -p "$OUT/sprites" "$OUT/sheets" "$OUT/effects" "$OUT/audio" "$WORK"

draw_config() {
  local name="$1" width="$2" height="$3" output="$4"
  node -e 'const fs=require("fs"); const [p,w,h,o]=process.argv.slice(1); fs.writeFileSync(p,JSON.stringify({width:+w,height:+h,background:"#00000000",actions:p.replace(/config.json$/,"actions.json"),preview:o,layers:p.replace(/config.json$/,"layers.json")}));' "$WORK/$name-config.json" "$width" "$height" "$output"
  draw --config "$WORK/$name-config.json" init
}

dc() { draw --config "$WORK/$1-config.json" "${@:2}"; }

core() {
  local name="$1" base="$2" light="$3" dark="$4" glyph="$5"
  draw_config "$name" 28 28 "$OUT/sprites/core-$name.png"
  dc "$name" fill-circle --cx 14 --cy 14 --r 13 --color '#0b1015ff'
  dc "$name" fill-circle --cx 14 --cy 14 --r 11 --color "$base"
  dc "$name" fill-rect --x 8 --y 5 --width 11 --height 3 --color "$light"
  dc "$name" line --x0 5 --y0 12 --x1 9 --y1 7 --color "$light"
  dc "$name" line --x0 21 --y0 10 --x1 20 --y1 19 --color "$dark"
  dc "$name" line --x0 8 --y0 22 --x1 19 --y1 22 --color "$dark"
  case "$glyph" in
    plus) dc "$name" fill-rect --x 12 --y 9 --width 4 --height 11 --color '#f8f3dcff'; dc "$name" fill-rect --x 9 --y 12 --width 11 --height 4 --color '#f8f3dcff' ;;
    bolt) dc "$name" line --x0 16 --y0 8 --x1 11 --y1 14 --color '#fff4c4ff'; dc "$name" line --x0 11 --y0 14 --x1 16 --y1 14 --color '#fff4c4ff'; dc "$name" line --x0 16 --y0 14 --x1 11 --y1 20 --color '#fff4c4ff' ;;
    ring) dc "$name" stroke-circle --cx 14 --cy 14 --r 5 --color '#f0fbffff'; dc "$name" fill-circle --cx 14 --cy 14 --r 1 --color '#f0fbffff' ;;
    diamond) dc "$name" line --x0 14 --y0 8 --x1 20 --y1 14 --color '#fff0f5ff'; dc "$name" line --x0 20 --y0 14 --x1 14 --y1 20 --color '#fff0f5ff'; dc "$name" line --x0 14 --y0 20 --x1 8 --y1 14 --color '#fff0f5ff'; dc "$name" line --x0 8 --y0 14 --x1 14 --y1 8 --color '#fff0f5ff' ;;
    leaf) dc "$name" line --x0 9 --y0 18 --x1 18 --y1 9 --color '#efffd8ff'; dc "$name" line --x0 10 --y0 17 --x1 10 --y1 11 --color '#efffd8ff'; dc "$name" line --x0 10 --y0 11 --x1 17 --y1 9 --color '#efffd8ff'; dc "$name" line --x0 18 --y0 9 --x1 16 --y1 16 --color '#efffd8ff'; dc "$name" line --x0 16 --y0 16 --x1 10 --y1 18 --color '#efffd8ff' ;;
  esac
}

core halide '#39cfe0ff' '#b6fbffff' '#137184ff' plus
core sulfur '#f2b43aff' '#fff09aff' '#98621cff' bolt
core cobalt '#5084edff' '#b6cfffff' '#24458fff' ring
core garnet '#df426cff' '#ffb0c4ff' '#842039ff' diamond
core olivine '#78c857ff' '#d6ffafff' '#397a2aff' leaf

mark() {
  local name="$1" color="$2"
  draw_config "mark-$name" 16 16 "$OUT/sprites/mark-$name.png"
  dc "mark-$name" fill-circle --cx 8 --cy 8 --r 7 --color '#071014cc'
  dc "mark-$name" stroke-circle --cx 8 --cy 8 --r 6 --color "$color"
  case "$name" in
    choke) dc "mark-$name" fill-rect --x 4 --y 5 --width 8 --height 2 --color "$color"; dc "mark-$name" fill-rect --x 6 --y 9 --width 4 --height 2 --color "$color" ;;
    backflow) dc "mark-$name" line --x0 4 --y0 8 --x1 11 --y1 4 --color "$color"; dc "mark-$name" line --x0 4 --y0 8 --x1 11 --y1 12 --color "$color"; dc "mark-$name" line --x0 4 --y0 8 --x1 12 --y1 8 --color "$color" ;;
    bore) dc "mark-$name" stroke-circle --cx 8 --cy 8 --r 3 --color "$color"; dc "mark-$name" fill-circle --cx 8 --cy 8 --r 1 --color "$color" ;;
    sightline) dc "mark-$name" line --x0 3 --y0 8 --x1 13 --y1 8 --color "$color"; dc "mark-$name" line --x0 8 --y0 3 --x1 8 --y1 13 --color "$color" ;;
  esac
}
mark choke '#ffd76aff'; mark backflow '#7ee7ffff'; mark bore '#ff775fff'; mark sightline '#e9ff91ff'

draw_config injector-base 44 44 "$OUT/sprites/injector-base.png"
dc injector-base fill-circle --cx 22 --cy 22 --r 21 --color '#101922ff'
dc injector-base fill-circle --cx 22 --cy 22 --r 18 --color '#6e5c42ff'
dc injector-base stroke-circle --cx 22 --cy 22 --r 15 --color '#c49b55ff'
dc injector-base fill-circle --cx 22 --cy 22 --r 9 --color '#182832ff'
for p in '8 8' '36 8' '8 36' '36 36'; do set -- $p; dc injector-base fill-circle --cx "$1" --cy "$2" --r 2 --color '#d6b66fff'; done

draw_config injector-barrel 44 20 "$OUT/sprites/injector-barrel.png"
dc injector-barrel fill-rect --x 2 --y 4 --width 33 --height 12 --color '#17242cff'
dc injector-barrel fill-rect --x 6 --y 6 --width 29 --height 4 --color '#ac8246ff'
dc injector-barrel fill-rect --x 34 --y 2 --width 7 --height 16 --color '#cda85fff'
dc injector-barrel fill-rect --x 40 --y 5 --width 4 --height 10 --color '#422f25ff'

draw_config intake-maw 64 64 "$OUT/sprites/intake-maw.png"
dc intake-maw fill-circle --cx 32 --cy 32 --r 31 --color '#0a0e12ff'
dc intake-maw stroke-circle --cx 32 --cy 32 --r 27 --color '#8a573bff'
dc intake-maw stroke-circle --cx 32 --cy 32 --r 22 --color '#d08448ff'
dc intake-maw fill-circle --cx 32 --cy 32 --r 17 --color '#020305ff'
for a in '29 8 35 19' '29 56 35 45' '8 29 19 35' '56 29 45 35'; do set -- $a; dc intake-maw line --x0 "$1" --y0 "$2" --x1 "$3" --y1 "$4" --color '#e5b768ff'; done

draw_config channel-plate 64 64 "$OUT/sprites/channel-plate.png"
dc channel-plate fill-rect --x 0 --y 0 --width 64 --height 64 --color '#26323aff'
dc channel-plate fill-rect --x 0 --y 4 --width 64 --height 2 --color '#354750ff'
dc channel-plate fill-rect --x 0 --y 58 --width 64 --height 2 --color '#172127ff'
dc channel-plate line --x0 0 --y0 31 --x1 63 --y1 31 --color '#2f4149ff'
for p in '5 10' '57 10' '5 52' '57 52'; do set -- $p; dc channel-plate fill-circle --cx "$1" --cy "$2" --r 2 --color '#8b6c48ff'; done

draw_config cell 24 24 "$OUT/sprites/hud-cell.png"
dc cell fill-rect --x 5 --y 2 --width 14 --height 20 --color '#172229ff'
dc cell stroke-rect --x 5 --y 2 --width 14 --height 20 --color '#d8b561ff'
dc cell fill-rect --x 8 --y 6 --width 8 --height 12 --color '#65d9c6ff'
dc cell fill-rect --x 9 --y 7 --width 3 --height 10 --color '#baffefff'

draw_config pressure 24 24 "$OUT/sprites/pressure.png"
dc pressure stroke-circle --cx 12 --cy 12 --r 10 --color '#d8b561ff'
dc pressure line --x0 12 --y0 12 --x1 17 --y1 7 --color '#ff6d56ff'
dc pressure fill-circle --cx 12 --cy 12 --r 2 --color '#f5e2adff'
dc pressure fill-rect --x 5 --y 17 --width 14 --height 2 --color '#18242bff'

# Frame animations.
sheet_config() {
  local name="$1" width="$2" height="$3" frames="$4"
  node -e 'const fs=require("fs"); const [p,w,h,n,o]=process.argv.slice(1); fs.writeFileSync(p,JSON.stringify({width:+w,height:+h,background:"#00000000",frames:Array.from({length:+n},(_,i)=>i),actions:p.replace(/config.json$/,"actions-{frame}.json"),preview:o+"/frame-{frame}.png",layers:p.replace(/config.json$/,"layers.json")}));' "$WORK/$name-config.json" "$width" "$height" "$frames" "$OUT/sheets/$name"
  mkdir -p "$OUT/sheets/$name"; draw-sheet --config "$WORK/$name-config.json" init
}
ds() { draw-sheet --config "$WORK/$1-config.json" --frame "$2" "${@:3}"; }

sheet_config recoil 44 20 4
for f in 0 1 2 3; do off=$((f==1?5:f==2?3:0)); ds recoil "$f" fill-rect --x $((2+off)) --y 5 --width 32 --height 10 --color '#bd914fff'; ds recoil "$f" fill-rect --x $((34+off)) --y 3 --width $((7-off/2)) --height 14 --color '#f0c46cff'; ds recoil "$f" fill-rect --x $((40+off)) --y 6 --width 4 --height 8 --color '#fff1b0ff'; done

sheet_config swallow 64 64 6
for f in 0 1 2 3 4 5; do gap=$((17-(f<3?f:5-f)*4)); ds swallow "$f" stroke-circle --cx 32 --cy 32 --r 28 --color '#bd7847ff'; ds swallow "$f" fill-circle --cx 32 --cy 32 --r 20 --color '#050608ff'; ds swallow "$f" line --x0 13 --y0 14 --x1 32 --y1 "$gap" --color '#edbd68ff'; ds swallow "$f" line --x0 51 --y0 14 --x1 32 --y1 "$gap" --color '#edbd68ff'; ds swallow "$f" line --x0 13 --y0 50 --x1 32 --y1 $((64-gap)) --color '#edbd68ff'; ds swallow "$f" line --x0 51 --y0 50 --x1 32 --y1 $((64-gap)) --color '#edbd68ff'; done

sheet_config extraction 48 48 6
for f in 0 1 2 3 4 5; do r=$((5+f*3)); ds extraction "$f" stroke-circle --cx 24 --cy 24 --r "$r" --color '#ffffffff'; ds extraction "$f" line --x0 24 --y0 $((24-r)) --x1 24 --y1 $((20-r)) --color '#fff2baff'; ds extraction "$f" line --x0 $((24+r)) --y0 24 --x1 $((28+r)) --y1 24 --color '#fff2baff'; ds extraction "$f" line --x0 24 --y0 $((24+r)) --x1 24 --y1 $((28+r)) --color '#fff2baff'; ds extraction "$f" line --x0 $((24-r)) --y0 24 --x1 $((20-r)) --y1 24 --color '#fff2baff'; done

# Particle systems are authored in their own local fields and translated in render.
particle_config() {
  local name="$1" duration="$2"
  node -e 'const fs=require("fs"); const [p,d,o]=process.argv.slice(1); fs.writeFileSync(p,JSON.stringify({width:160,height:160,duration_ms:+d,fps:60,seed:7331,actions:p.replace(/config.json$/,"actions.json"),preview:o+"/preview.gif",system:o+"/system.json"}));' "$WORK/$name-config.json" "$duration" "$OUT/effects/$name"
  mkdir -p "$OUT/effects/$name"; particle-2d --config "$WORK/$name-config.json" init
}
particle_make() {
  local name="$1" count="$2" life="$3" speed="$4" diry="$5" cone="$6" color="$7" duration="$8"
  particle_config "$name" "$duration"
  particle-2d --config "$WORK/$name-config.json" add-emitter --name sparks --shape point --x 80 --y 80 --burst "$count" --lifetime "$life" --lifetime-spread 80 --speed "$speed" --speed-spread 35 --dir-x 0 --dir-y "$diry" --cone-angle "$cone"
  particle-2d --config "$WORK/$name-config.json" set-particle --emitter sparks --size-curve ease-out --size-from 3.5 --size-to .2 --opacity-curve ease-in --opacity-from 1 --opacity-to 0 --color-gradient "$color" --stretch 1.7
  particle-2d --config "$WORK/$name-config.json" render
}
particle_make extraction-burst 22 330 150 1 360 '#fff4c4@0,#ff863c@0.5,#6b1e17@1' 650
particle_make bore-detonation 38 700 105 1 360 '#ffdc78@0,#d24b32@0.45,#341819@1' 1050
particle_make intake-spray 24 520 90 -1 55 '#b9e8e3@0,#578789@0.5,#1b252b@1' 850
particle_make pickup-shimmer 20 620 70 1 30 '#ffffff@0,#d9ff86@0.45,#4cb5a4@1' 850

# Procedural one-shots.
synth_config() {
  local name="$1" duration="$2"
  node -e 'const fs=require("fs"); const [p,d,o]=process.argv.slice(1); fs.writeFileSync(p,JSON.stringify({sample_rate:44100,channels:"stereo",max_duration_ms:+d,seed:7331,actions:p.replace(/config.json$/,"actions.json"),preview:p.replace(/config.json$/,"preview.png"),wav:o}));' "$WORK/$name-config.json" "$duration" "$OUT/audio/$name.wav"
  sfx-synth --config "$WORK/$name-config.json" init
}
make_synth() {
  local name="$1" wave="$2" freq="$3" dur="$4" env="$5" gain="$6"
  synth_config "$name" $((dur+100)); sfx-synth --config "$WORK/$name-config.json" add-voice --name main --wave "$wave" --freq "$freq" --gain "$gain" --dur "$dur"; sfx-synth --config "$WORK/$name-config.json" set-envelope --voice main --env "$env"; sfx-synth --config "$WORK/$name-config.json" render
}
make_synth fire noise 440 110 punch -12
make_synth seat triangle 190 150 punch -8
make_synth swap sine 720 90 pluck -10
make_synth denied square 115 190 punch -11
synth_config machinery 520
sfx-synth --config "$WORK/machinery-config.json" add-voice --name rise --wave triangle --freq 420 --gain -9 --dur 400
sfx-synth --config "$WORK/machinery-config.json" set-envelope --voice rise --env swell
sfx-synth --config "$WORK/machinery-config.json" add-arpeggio --voice rise --rate 12 --depth 12
sfx-synth --config "$WORK/machinery-config.json" render

# Sample-backed impacts and outcomes.
sample_config() {
  local name="$1" duration="$2"
  node -e 'const fs=require("fs"); const [p,d,o]=process.argv.slice(1); fs.writeFileSync(p,JSON.stringify({sample_rate:44100,channels:"stereo",max_duration_ms:+d,seed:7331,sample_pack:"combat-core",actions:p.replace(/config.json$/,"actions.json"),preview:p.replace(/config.json$/,"preview.png"),wav:o}));' "$WORK/$name-config.json" "$duration" "$OUT/audio/$name.wav"
  sfx-sample --config "$WORK/$name-config.json" init
}
sample_config browse 1000
SAMPLE=$(sfx-sample --config "$WORK/browse-config.json" list-samples --tag impact | awk 'NR==2{print $1}')
[[ -n "$SAMPLE" ]] || SAMPLE=$(sfx-sample --config "$WORK/browse-config.json" list-samples | awk 'NR==2{print $1}')
for i in 1 2 3 4 5; do sample_config "extract-$i" 900; sfx-sample --config "$WORK/extract-$i-config.json" add-sample --name "$SAMPLE" --t 0 --gain -7 --pitch $(((i-1)*2)); sfx-sample --config "$WORK/extract-$i-config.json" render; done
for item in 'intake -5' 'level-clear 5' 'cell-lost -10'; do set -- $item; sample_config "$1" 1400; sfx-sample --config "$WORK/$1-config.json" add-sample --name "$SAMPLE" --t 0 --gain -3 --pitch "$2"; sfx-sample --config "$WORK/$1-config.json" render; done

# Two related 8-beat synthwave loops, emitted as WAV + MIDI.
music_config() {
  local name="$1"
  node -e 'const fs=require("fs"); const [p,o]=process.argv.slice(1); fs.writeFileSync(p,JSON.stringify({sample_rate:44100,channels:"stereo",max_duration_ms:9000,seed:7331,instrument_bank:"synthwave",actions:p.replace(/config.json$/,"actions.json"),preview:p.replace(/config.json$/,"preview.png"),wav:o+".wav",mid:o+".mid"}));' "$WORK/$name-config.json" "$OUT/audio/$name"
  music --config "$WORK/$name-config.json" init; music --config "$WORK/$name-config.json" set-tempo --bpm 64; music --config "$WORK/$name-config.json" set-time-signature --num 4 --den 4; music --config "$WORK/$name-config.json" define-track --name pulse --instrument triangle; music --config "$WORK/$name-config.json" define-track --name air --instrument sine
}
music_config hall-loop
for t in 0 1 2 3 4 5 6 7; do p=(C2 C2 Eb2 C2 Ab1 Ab1 Bb1 G1); music --config "$WORK/hall-loop-config.json" add-note --track pulse --pitch "${p[$t]}" --t "$t" --dur .9 --velocity 64; done
for item in 'C3 0 4' 'Ab2 4 4'; do set -- $item; music --config "$WORK/hall-loop-config.json" add-note --track air --pitch "$1" --t "$2" --dur "$3" --velocity 42; done
music --config "$WORK/hall-loop-config.json" render
music_config danger-loop
for t in 0 1 2 3 4 5 6 7; do p=(C2 C3 Eb2 C3 Db2 Db3 G1 G2); music --config "$WORK/danger-loop-config.json" add-note --track pulse --pitch "${p[$t]}" --t "$t" --dur .72 --velocity 82; done
for item in 'C4 0 2' 'Db4 2 2' 'C4 4 2' 'Bb3 6 2'; do set -- $item; music --config "$WORK/danger-loop-config.json" add-note --track air --pitch "$1" --t "$2" --dur "$3" --velocity 54; done
music --config "$WORK/danger-loop-config.json" render

rm -rf "$WORK"
echo "Volute assets generated in $OUT"
