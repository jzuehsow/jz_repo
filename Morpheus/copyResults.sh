#!/bin/bash

NOW="$(date '+%Y%m%d-%H:%M:%S')"

#podman start --device nvidia.com/gpu=0 --security-opt=label=disable morpheus-logs bash

podman cp morpheus-logs:/workspace/log-parsing-output.jsonlines ./log-parsing-output-${NOW}.jsonlines

#podman stop morpheus-logs