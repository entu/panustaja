#! /bin/bash
rm -r Panustaja*
electron-packager . Panustaja --platform=all --arch=x64 --version=0.34.1 --ignore Panustaja
