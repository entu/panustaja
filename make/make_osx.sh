#!/bin/sh
# Make osx32

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )"/.. && pwd )
cd ${DIR}

workingDir="${DIR}/bin/osx32"
applicationName="Panustaja.app"
DMGName="${DIR}/bin/temp.dmg"
finalDMGName="${DIR}/bin/Panustaja.dmg"
sizeOfDmg="200M"
diskTitle="Panustaja installer"
nwAppPath="${workingDir}/${applicationName}"
backgroundPictureName="arrow.png"

rm -rf "${workingDir}" "${finalDMGName}"
mkdir -p "${workingDir}"

cp -r "${DIR}/source" "${workingDir}"
# cp -r "${DIR}/imgs" "${workingDir}"
cp -r "${DIR}/node_modules" "${workingDir}"
cp -r "${DIR}/index.html" "${workingDir}"
cp -r "${DIR}/package.json" "${workingDir}"
cp -r "${DIR}/LICENSE.md" "${workingDir}"

pushd "${workingDir}"
  zip -r ../app.nw ./*
  rm -r *
popd

cp -r "${DIR}/../../nwbuilder/cache/0.8.6/osx32/node-webkit.app" "${nwAppPath}"
# cp "${DIR}/ffmpegsumo for 0.8.6/ffmpegsumo.so" "${nwAppPath}/Contents/Frameworks/node-webkit Framework.framework/Libraries/"
mv "${DIR}/bin/app.nw" "${nwAppPath}/Contents/resources/"
cp "${DIR}/source/images/murakas.icns" "${nwAppPath}/Contents/resources/nw.icns"

# Replace information in Node-Webkit's Info.plist
patch "${nwAppPath}/Contents/Info.plist" "make/info_plist.patch"


# Create a R/W DMG
hdiutil create -srcfolder "${workingDir}" -volname "${diskTitle}" \
        -fs HFS+ -fsargs "-c c=64,a=16,e=16" -format UDRW -size ${sizeOfDmg} "${DMGName}"


# Mount the image
device=$(hdiutil attach -readwrite -noverify -noautoopen "${DMGName}" | \
         egrep '^/dev/' | sed 1q | awk '{print $1}')


# Prepare for ascript
pushd "/Volumes/${diskTitle}"
  mkdir -p .background
  cp "${DIR}/make/${backgroundPictureName}" .background
popd


# Run ascript
echo '
   tell application "Finder"
     tell disk "'${diskTitle}'"
           open
           set current view of container window to icon view
           set toolbar visible of container window to false
           set statusbar visible of container window to false
           set the bounds of container window to {400, 100, 885, 330}
           set theViewOptions to the icon view options of container window
           set arrangement of theViewOptions to not arranged
           set icon size of theViewOptions to 72
           set background picture of theViewOptions to file ".background:'${backgroundPictureName}'"
           make new alias file at container window to POSIX file "/Applications" with properties {name:"Applications"}
           set position of item "'${applicationName}'" of container window to {100, 100}
           set position of item "Applications" of container window to {375, 100}
           update without registering applications
           delay 5
           close
     end tell
   end tell
' | osascript

chmod -Rf go-w "/Volumes/${diskTitle}"
sync
hdiutil detach ${device}

hdiutil convert "${DMGName}" -format UDZO -imagekey zlib-level=9 -o "${finalDMGName}"
rm -f "${DMGName}"
rm -rf "${workingDir}"




