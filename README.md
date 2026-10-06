# GS-Pool: Object-Level Change Detection in 3D Gaussian Splatting

*Boaz Keren-Gil, James Gain, Patrick Marais*

[![Project Page](https://img.shields.io/badge/Project%20Page-GS--Pool-blue?logo=googlechrome&logoColor=white)](https://boazkg93.github.io/gs-pool/)
[![Paper](https://img.shields.io/badge/arXiv-2610.06688-b31b1b?logo=arxiv&logoColor=white)](https://arxiv.org/abs/2610.06688)
[![Code](https://img.shields.io/badge/Code-coming%20soon-lightgrey?logo=github)](#)
[![Dataset: PASLCD outputs](https://img.shields.io/badge/Dataset-gs--pool--paslcd-ffd21e?logo=huggingface&logoColor=black)](https://huggingface.co/datasets/boazkg/gs-pool-paslcd)
[![Dataset: CL-Splats annotations](https://img.shields.io/badge/Dataset-gs--pool--cl--splats-ffd21e?logo=huggingface&logoColor=black)](https://huggingface.co/datasets/boazkg/gs-pool-cl-splats)

<p align="center"><img src="docs/assets/banner.png" alt="University of Cape Town, Department of Computer Science, School of IT" width="100%"></p>

*Abstract*: Factories, museums and surveyors photograph the same space months apart and need to
know which objects changed. When each visit is reconstructed with 3D Gaussian Splatting (3DGS),
a direct comparison of the two reconstructions does not answer this. Training is stochastic, so
two reconstructions of an unchanged space never coincide, and the second visit is often a quick
re-scan with far fewer photographs. We propose GS-Pool, which takes two independently
reconstructed Gaussian fields of the same space and returns the changed objects in each,
together with their masks. SAM2 masks of each visit's photographs are lifted onto the Gaussians
that render them and merged into an *object pool*, so every decision is taken once per object in
3D. We introduce a *photographic carrier*, the 3DGS training loss of each input reconstruction
against the other visit's photographs, backpropagated to the Gaussians that rendered each pixel.
We combine it with GS-Diff's geometry and colour terms and our distilled DINOv3 features. This
evidence is compared with that of the objects present in both visits, which sets a change
threshold for each scene. On PASLCD, GS-Pool reaches mIoU/F1 scores of 0.751/0.846 against
0.644/0.758 for GS-Diff, the strongest prior method, a gain of 17%/12%. Its mIoU is also 36%,
40% and 57% above that of O-SCD, PlenoCI and MV-3DCD, and it reaches 0.855 mIoU on CL-Splats,
33% above MV-3DCD. Each changed object is returned as a set of Gaussians with the evidence
behind its decision, which an inspector can review in 3D.

## Code and data

Our outputs on PASLCD ([boazkg/gs-pool-paslcd](https://huggingface.co/datasets/boazkg/gs-pool-paslcd)) and our change annotations for CL-Splats ([boazkg/gs-pool-cl-splats](https://huggingface.co/datasets/boazkg/gs-pool-cl-splats)) are on Hugging Face. The code will be released here.

## BibTeX

```bibtex
@article{kerengil2026gspool,
  title   = {GS-Pool: Object-Level Change Detection in 3D Gaussian Splatting},
  author  = {Keren-Gil, Boaz and Gain, James and Marais, Patrick},
  journal = {arXiv preprint arXiv:2610.06688},
  year    = {2026}
}
```

## Acknowledgement

GS-Pool builds on [3D Gaussian Splatting](https://github.com/graphdeco-inria/gaussian-splatting),
[FastGS](https://github.com/fastgs/FastGS) (its FastPGSR branch), [gsplat](https://github.com/nerfstudio-project/gsplat),
[DINOv3](https://github.com/facebookresearch/dinov3) and [SAM 2](https://github.com/facebookresearch/sam2), and adopts
[GS-Diff](https://arxiv.org/abs/2605.07203)'s per-primitive change kernels. We thank the authors of
[PASLCD](https://huggingface.co/datasets/ChamudithaJay/PASLCD) and
[CL-Splats](https://huggingface.co/datasets/ackermannj/cl-splats-dataset) for releasing their data.

## License

MIT, see [LICENSE](LICENSE).
