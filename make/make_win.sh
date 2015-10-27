#!/bin/sh
# Make win32

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )"/.. && pwd )
cd ${DIR}
diskTitle="Panustaja"
workingDir="${DIR}/bin/${diskTitle}"

rm -rf "${workingDir}"
mkdir -p "${workingDir}"

cp -r "${DIR}/source" "${workingDir}"
cp -r "${DIR}/node_modules" "${workingDir}"
cp -r "${DIR}/package.json" "${workingDir}"
cp -r "${DIR}/LICENSE.md" "${workingDir}"

pushd "${workingDir}"
  echo "zip -r ../app.nw ./*"
  zip -r ../app.nw ./*
  rm -r *
popd

cp "${DIR}/../../nwbuilder/cache/0.12.2/win32/icudtl.dat" "${workingDir}"
cp "${DIR}/../../nwbuilder/cache/0.12.2/win32/libEGL.dll" "${workingDir}"
cp "${DIR}/../../nwbuilder/cache/0.12.2/win32/libGLESv2.dll" "${workingDir}"
cp "${DIR}/../../nwbuilder/cache/0.12.2/win32/nw.exe" "${workingDir}"
cp "${DIR}/../../nwbuilder/cache/0.12.2/win32/nw.pak" "${workingDir}"

echo "cat \"${workingDir}/nw.exe\" \"${DIR}/bin/app.nw\" > \"${workingDir}/Panustaja.exe\""
cat "${workingDir}/nw.exe" "${DIR}/bin/app.nw" > "${workingDir}/Panustaja.exe"
rm -f "${workingDir}/nw.exe" "${DIR}/bin/app.nw"


# pushd "${DIR}/bin"
#   zip -r "panustaja_win32".zip "${diskTitle}"/*
# popd

# cat "${DIR}/make/unzipsfx.exe" "${DIR}/bin/panustaja_win32.zip" > "${DIR}/bin/panustaja_setup.exe"
# zip -A "${DIR}/bin/panustaja_setup.exe"

