# kurento-robot-camera-k8s
This k8s configuration yamls construct a system to transmit a robot camera stream to browser(s) through Internet.

## Description
This system uses the [Kurento media server](http://www.kurento.org/) to relay the camera stream to browser. The architecture of this system is like below:

* signaling to exchange SDP.
![signalinc](https://camo.qiitausercontent.com/8d58ec2fbb7936c32f3924f74a216b2ebbe17f98/68747470733a2f2f71696974612d696d6167652d73746f72652e73332e616d617a6f6e6177732e636f6d2f302f33373634382f30313666633330322d663232302d626334312d366634362d3432353139366635333337612e706e67)

* transmitting a camera stream through IKEv2 VPN and WebRTC.
![transmitting](https://camo.qiitausercontent.com/ebad576d5c1304bcf63611569b1aefa87bc60b95/68747470733a2f2f71696974612d696d6167652d73746f72652e73332e616d617a6f6e6177732e636f6d2f302f33373634382f32333839376232342d386562652d666236322d613734342d3266626136373835363737612e706e67)

## Requirement
||version|
|:--|:--|
|[kurento](http://www.kurento.org/)|6.9.0|
|[coturn](https://github.com/coturn/coturn)|4.5.0.8-r1|
|[kubernetes(Microsoft Azure AKS)](https://azure.microsoft.com/en-us/services/kubernetes-service/)|1.12.6|
|[kurento-robot-camera-mjpeg2many](https://github.com/nmatsui/kurento-robot-camera-mjpeg2many)|latest|

## How to use
Please see below blogs:
  https://qiita.com/nmatsui/items/d1f7ceaa84cf805ee636
  https://qiita.com/nmatsui/items/8bc9dc224fd9d288c56c
  https://qiita.com/nmatsui/items/30adbeebd15b4c3de0ea

## License

[Apache License 2.0](/LICENSE)

## Copyright
Copyright (c) 2019 Nobuyuki Matsui <nobuyuki.matsui@gmail.com>
