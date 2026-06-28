class Flatmaxx < Formula
  desc "Creates CNC files from a KiCAD project"
  homepage "https://github.com/brunostjohn/flatmaxxing"
  version "1.0.0"
  url "https://github.com/brunostjohn/flatmaxxing/releases/download/v#{version}/flatmaxx-darwin-arm64"
  sha256 "ab425656a15aecc33f93659b8e4980bdeca28ec3a8ccff5c18b804bc3cd19f08"
  license "MIT"

  depends_on :macos

  def install
    odie "flatmaxx only ships an Apple Silicon (arm64) binary." unless Hardware::CPU.arm?
    bin.install "flatmaxx-darwin-arm64" => "flatmaxx"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/flatmaxx --version")
  end
end
