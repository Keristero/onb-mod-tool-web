{ pkgs ? import <nixpkgs> {} }:

let
  # Source directory for DartLangModTool
  # Use cleanSourceWith to properly handle git submodules and filter out .git
  dartToolSrc = pkgs.lib.cleanSourceWith {
    src = ./DartLangModTool-master;
    filter = path: type:
      let baseName = baseNameOf path;
      in !(baseName == ".git" || baseName == ".gitignore");
  };

in {
  # Native CLI build
  native = pkgs.stdenv.mkDerivation {
    pname = "onb-mod-file-native";
    version = "1.0.0";
    
    src = dartToolSrc;
    
    nativeBuildInputs = with pkgs; [
      dart
    ];
    
    buildPhase = ''
      export HOME=$TMPDIR
      
      # Get dependencies
      dart pub get
      
      # Compile to native executable
      dart compile exe bin/onb_mod_file.dart -o onb_mod_file
    '';
    
    installPhase = ''
      mkdir -p $out/bin
      cp onb_mod_file $out/bin/
    '';
    
    meta = with pkgs.lib; {
      description = "ONB Mod File Analyzer - Native CLI";
      homepage = "https://github.com/TheMaverickProgrammer/DartLangModTool";
      license = licenses.mit;
      platforms = platforms.all;
    };
  };

  # WebAssembly build
  wasm = pkgs.stdenv.mkDerivation {
    pname = "onb-mod-file-wasm";
    version = "1.0.0";
    
    src = dartToolSrc;
    
    nativeBuildInputs = with pkgs; [
      dart
    ];
    
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

  # Combined build for convenience
  all = pkgs.symlinkJoin {
    name = "onb-mod-file-all";
    paths = [
      (pkgs.callPackage ./default.nix {}).native
      (pkgs.callPackage ./default.nix {}).wasm
    ];
  };
}
