{ pkgs ? import <nixpkgs> {} }:

let
  # Use unstable channel for newer Dart SDK
  unstable = import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/nixos-unstable.tar.gz") {};
  
  # Source directory for DartLangModTool
  # Filter out .git directory to avoid permission issues with submodules
  dartToolSrc = builtins.filterSource
    (path: type: baseNameOf path != ".git")
    ./DartLangModTool-master;

in {
  # WebAssembly build
  wasm = pkgs.stdenv.mkDerivation {
    pname = "onb-mod-file-wasm";
    version = "1.0.0";
    
    src = dartToolSrc;
    
    nativeBuildInputs = [
      unstable.dart
    ];
    
    unpackPhase = ''
      # Copy source to a writable location
      mkdir -p ./source
      cp -r $src/* ./source/
      chmod -R u+w ./source
      cd ./source
    '';
    
    buildPhase = ''
      export HOME=$TMPDIR
      
      # Get dependencies
      dart pub get
      
      # Compile to WASM
      dart compile wasm web/main.dart -o onb_mod_file.wasm
    '';
    
    installPhase = ''
      mkdir -p $out
      cp onb_mod_file.wasm $out/
      cp onb_mod_file.mjs $out/
      
      # Create metadata.json
      cat > $out/metadata.json << EOF
      {
        "version": "1.0.0",
        "buildDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
        "dartVersion": "$(dart --version 2>&1 | head -n1)",
        "features": [
          "mod-analysis",
          "lua-parsing",
          "json-output"
        ]
      }
      EOF
    '';
    
    meta = with pkgs.lib; {
      description = "ONB Mod File Analyzer - WebAssembly";
      homepage = "https://github.com/TheMaverickProgrammer/DartLangModTool";
      license = licenses.mit;
      platforms = platforms.all;
    };
  };


}
