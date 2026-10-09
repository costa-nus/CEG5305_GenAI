// Course bibliography, one entry per work, rendered in APA 7 style shortened for a
// slide footer: first author + "et al." from three authors up, and the journal or
// conference without volume, issue or pages (the link carries the rest). Every URL and every
// title/author/venue below was checked against the landing page, Crossref or arXiv
// on 15 Sep 2026 (Lecture 1 session 01) or 16 Sep 2026 (entries added for the other sessions,
// merged from each session's references/bib_additions.js). brants2007, wu2016, openai2022 and
// huggingface2025b were added and checked on 29 Sep 2026 (Lecture 1 session 01, slides 5 and 8);
// hendrycks2021, openai2023, ho2024 and epochai2026 the same day (slide 4, the scaling chart);
// markov1913 the same day, from Crossref (the Markov-chain slide). brown2024 and snell2024
// were added and checked against their arXiv PDFs on 4 Oct 2026 (Lecture 1 session 02, test-time scaling);
// openai2024 the same day, from the post itself (title, date 12 Sep 2024, URL). kwa2025 (arXiv v4 title)
// and openai2026 (the YouTube page: OpenAI channel, 25 Aug 2026) were checked on 5 Oct 2026; ricouard2026
// the same day, from the post (author, date 4 Sep 2026, URL).
// munroe2009, munroe2014 and munroe2017 (xkcd 605, 1425, 1838: titles and dates from xkcd's JSON), sanderson2024
// (YouTube oEmbed title and channel; upload date 20 Nov 2024 from the watch page) and wei2023b (arXiv listing; renamed from a duplicate wei2023 key on 6 Oct 2026)
// were added and checked on 5 Oct 2026 (Lecture 1 session 02, redesign). qwen2024 (the citation on the
// Qwen2.5-0.5B model card; blog URL returns 200) and socher2013 (ACL Anthology metadata) the same day, for the homework.
//
// Cite in HTML with <a data-ref="key">Author et al.</a>. A slide lists its references
// in a footer: every data-ref inside it, plus any keys in <section data-refs="…">.
export const BIB = {
  markov1913: { a: "Markov, A. A.", y: 1913, t: "An example of statistical investigation of the text Eugene Onegin concerning the connection of samples in chains", v: "English translation in Science in Context, 19(4), 2006", u: "https://doi.org/10.1017/S0269889706001074" },
  shannon1948: { a: "Shannon, C. E.", y: 1948, t: "A mathematical theory of communication", v: "Bell System Technical Journal", u: "https://doi.org/10.1002/j.1538-7305.1948.tb01338.x" },
  bradley1952: { a: "Bradley, R. A., & Terry, M. E.", y: 1952, t: "Rank analysis of incomplete block designs: I. The method of paired comparisons", v: "Biometrika", u: "https://doi.org/10.2307/2334029" },
  elman1990: { a: "Elman, J. L.", y: 1990, t: "Finding structure in time", v: "Cognitive Science", u: "https://doi.org/10.1207/s15516709cog1402_1" },
  williams1992: { a: "Williams, R. J.", y: 1992, t: "Simple statistical gradient-following algorithms for connectionist reinforcement learning", v: "Machine Learning", u: "https://doi.org/10.1007/BF00992696" },
  bengio1994: { a: "Bengio, Y., et al.", y: 1994, t: "Learning long-term dependencies with gradient descent is difficult", v: "IEEE Transactions on Neural Networks", u: "https://doi.org/10.1109/72.279181" },
  hochreiter1997: { a: "Hochreiter, S., & Schmidhuber, J.", y: 1997, t: "Long short-term memory", v: "Neural Computation", u: "https://doi.org/10.1162/neco.1997.9.8.1735" },
  gers2000: { a: "Gers, F. A., et al.", y: 2000, t: "Learning to forget: Continual prediction with LSTM", v: "Neural Computation", u: "https://doi.org/10.1162/089976600300015015" },
  bengio2003: { a: "Bengio, Y., et al.", y: 2003, t: "A neural probabilistic language model", v: "Journal of Machine Learning Research", u: "https://www.jmlr.org/papers/v3/bengio03a.html" },
  brants2007: { a: "Brants, T., et al.", y: 2007, t: "Large language models in machine translation", v: "EMNLP-CoNLL", u: "https://aclanthology.org/D07-1090/" },
  mikolov2010: { a: "Mikolov, T., et al.", y: 2010, t: "Recurrent neural network based language model", v: "Interspeech", u: "https://www.isca-archive.org/interspeech_2010/mikolov10_interspeech.html" },
  graves2013: { a: "Graves, A.", y: 2013, t: "Generating sequences with recurrent neural networks", v: "arXiv:1308.0850", u: "https://arxiv.org/abs/1308.0850" },
  karpathy2014: { a: "Karpathy, A.", y: 2014, t: "RecurrentJS", v: "GitHub", u: "https://github.com/karpathy/recurrentjs", software: true },
  sutskever2014: { a: "Sutskever, I., et al.", y: 2014, t: "Sequence to sequence learning with neural networks", v: "NeurIPS", u: "https://arxiv.org/abs/1409.3215" },
  bahdanau2015: { a: "Bahdanau, D., et al.", y: 2015, t: "Neural machine translation by jointly learning to align and translate", v: "ICLR", u: "https://arxiv.org/abs/1409.0473" },
  ioffe2015: { a: "Ioffe, S., & Szegedy, C.", y: 2015, t: "Batch normalization: Accelerating deep network training by reducing internal covariate shift", v: "ICML", u: "https://arxiv.org/abs/1502.03167" },
  karpathy2015: { a: "Karpathy, A.", y: 2015, t: "REINFORCEjs", v: "GitHub", u: "https://github.com/karpathy/reinforcejs", software: true },
  karpathy2015b: { a: "Karpathy, A.", y: 2015, t: "char-rnn", v: "GitHub", u: "https://github.com/karpathy/char-rnn", software: true }, // TinyShakespeare: data/tinyshakespeare/input.txt, checked 29 Sep 2026
  kingma2015: { a: "Kingma, D. P., & Ba, J.", y: 2015, t: "Adam: A method for stochastic optimization", v: "ICLR", u: "https://arxiv.org/abs/1412.6980" },
  rumelhart1986: { a: "Rumelhart, D. E., Hinton, G. E., & Williams, R. J.", y: 1986, t: "Learning representations by back-propagating errors", v: "Nature", u: "https://doi.org/10.1038/323533a0" },
  ba2016: { a: "Ba, J. L., et al.", y: 2016, t: "Layer normalization", v: "arXiv:1607.06450", u: "https://arxiv.org/abs/1607.06450" },
  he2016: { a: "He, K., et al.", y: 2016, t: "Deep residual learning for image recognition", v: "CVPR", u: "https://arxiv.org/abs/1512.03385" },
  hendrycks2016: { a: "Hendrycks, D., & Gimpel, K.", y: 2016, t: "Gaussian error linear units (GELUs)", v: "arXiv:1606.08415", u: "https://arxiv.org/abs/1606.08415" },
  sennrich2016: { a: "Sennrich, R., et al.", y: 2016, t: "Neural machine translation of rare words with subword units", v: "ACL", u: "https://arxiv.org/abs/1508.07909" },
  wu2016: { a: "Wu, Y., et al.", y: 2016, t: "Google's neural machine translation system: Bridging the gap between human and machine translation", v: "arXiv:1609.08144", u: "https://arxiv.org/abs/1609.08144" },
  christiano2017: { a: "Christiano, P. F., et al.", y: 2017, t: "Deep reinforcement learning from human preferences", v: "NeurIPS", u: "https://arxiv.org/abs/1706.03741" },
  oord2017: { a: "van den Oord, A., et al.", y: 2017, t: "Neural discrete representation learning", v: "NeurIPS", u: "https://arxiv.org/abs/1711.00937" },
  press2017: { a: "Press, O., & Wolf, L.", y: 2017, t: "Using the output embedding to improve language models", v: "EACL", u: "https://arxiv.org/abs/1608.05859" },
  schulman2017: { a: "Schulman, J., et al.", y: 2017, t: "Proximal policy optimization algorithms", v: "arXiv:1707.06347", u: "https://arxiv.org/abs/1707.06347" },
  shazeer2017: { a: "Shazeer, N., et al.", y: 2017, t: "Outrageously large neural networks: The sparsely-gated mixture-of-experts layer", v: "ICLR", u: "https://arxiv.org/abs/1701.06538" },
  vaswani2017: { a: "Vaswani, A., et al.", y: 2017, t: "Attention is all you need", v: "NeurIPS", u: "https://arxiv.org/abs/1706.03762" },
  fan2018: { a: "Fan, A., et al.", y: 2018, t: "Hierarchical neural story generation", v: "ACL", u: "https://arxiv.org/abs/1805.04833" },
  gidaris2018: { a: "Gidaris, S., et al.", y: 2018, t: "Unsupervised representation learning by predicting image rotations", v: "ICLR", u: "https://arxiv.org/abs/1803.07728" },
  gurari2018: { a: "Gurari, D., et al.", y: 2018, t: "VizWiz Grand Challenge: Answering visual questions from blind people", v: "CVPR", u: "https://arxiv.org/abs/1802.08218" },
  micikevicius2018: { a: "Micikevicius, P., et al.", y: 2018, t: "Mixed precision training", v: "ICLR", u: "https://arxiv.org/abs/1710.03740" },
  oord2018: { a: "van den Oord, A., et al.", y: 2018, t: "Representation learning with contrastive predictive coding", v: "arXiv:1807.03748", u: "https://arxiv.org/abs/1807.03748" },
  radford2018: { a: "Radford, A., et al.", y: 2018, t: "Improving language understanding by generative pre-training", v: "OpenAI", u: "https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf" },
  rohrbach2018: { a: "Rohrbach, A., et al.", y: 2018, t: "Object hallucination in image captioning", v: "EMNLP", u: "https://arxiv.org/abs/1809.02156" },
  devlin2019: { a: "Devlin, J., et al.", y: 2019, t: "BERT: Pre-training of deep bidirectional Transformers for language understanding", v: "NAACL", u: "https://arxiv.org/abs/1810.04805" },
  houlsby2019: { a: "Houlsby, N., et al.", y: 2019, t: "Parameter-efficient transfer learning for NLP", v: "ICML", u: "https://arxiv.org/abs/1902.00751" },
  huang2019: { a: "Huang, Y., et al.", y: 2019, t: "GPipe: Efficient training of giant neural networks using pipeline parallelism", v: "NeurIPS", u: "https://arxiv.org/abs/1811.06965" },
  kalamkar2019: { a: "Kalamkar, D., et al.", y: 2019, t: "A study of BFLOAT16 for deep learning training", v: "arXiv:1905.12322", u: "https://arxiv.org/abs/1905.12322" },
  lacoste2019: { a: "Lacoste, A., et al.", y: 2019, t: "Quantifying the carbon emissions of machine learning", v: "arXiv:1910.09700", u: "https://arxiv.org/abs/1910.09700" },
  loshchilov2019: { a: "Loshchilov, I., & Hutter, F.", y: 2019, t: "Decoupled weight decay regularization", v: "ICLR", u: "https://arxiv.org/abs/1711.05101" },
  radford2019: { a: "Radford, A., et al.", y: 2019, t: "Language models are unsupervised multitask learners", v: "OpenAI", u: "https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf" },
  shoeybi2019: { a: "Shoeybi, M., et al.", y: 2019, t: "Megatron-LM: Training multi-billion parameter language models using model parallelism", v: "arXiv:1909.08053", u: "https://arxiv.org/abs/1909.08053" },
  zhang2019: { a: "Zhang, B., & Sennrich, R.", y: 2019, t: "Root mean square layer normalization", v: "NeurIPS", u: "https://arxiv.org/abs/1910.07467" },
  brown2020: { a: "Brown, T. B., et al.", y: 2020, t: "Language models are few-shot learners", v: "NeurIPS", u: "https://arxiv.org/abs/2005.14165" },
  chen2020a: { a: "Chen, T., et al.", y: 2020, t: "A simple framework for contrastive learning of visual representations", v: "ICML", u: "https://arxiv.org/abs/2002.05709" },
  grill2020: { a: "Grill, J.-B., et al.", y: 2020, t: "Bootstrap your own latent: A new approach to self-supervised learning", v: "NeurIPS", u: "https://arxiv.org/abs/2006.07733" },
  he2020: { a: "He, K., et al.", y: 2020, t: "Momentum contrast for unsupervised visual representation learning", v: "CVPR", u: "https://arxiv.org/abs/1911.05722" },
  henighan2020: { a: "Henighan, T., et al.", y: 2020, t: "Scaling laws for autoregressive generative modeling", v: "arXiv:2010.14701", u: "https://arxiv.org/abs/2010.14701" },
  holtzman2020: { a: "Holtzman, A., et al.", y: 2020, t: "The curious case of neural text degeneration", v: "ICLR", u: "https://arxiv.org/abs/1904.09751" },
  kaplan2020: { a: "Kaplan, J., et al.", y: 2020, t: "Scaling laws for neural language models", v: "arXiv:2001.08361", u: "https://arxiv.org/abs/2001.08361" },
  raffel2020: { a: "Raffel, C., et al.", y: 2020, t: "Exploring the limits of transfer learning with a unified text-to-text Transformer", v: "Journal of Machine Learning Research", u: "https://arxiv.org/abs/1910.10683" },
  rajbhandari2020: { a: "Rajbhandari, S., et al.", y: 2020, t: "ZeRO: Memory optimizations toward training trillion parameter models", v: "SC20", u: "https://arxiv.org/abs/1910.02054" },
  shazeer2020: { a: "Shazeer, N.", y: 2020, t: "GLU variants improve Transformer", v: "arXiv:2002.05202", u: "https://arxiv.org/abs/2002.05202" },
  stiennon2020: { a: "Stiennon, N., et al.", y: 2020, t: "Learning to summarize from human feedback", v: "NeurIPS", u: "https://arxiv.org/abs/2009.01325" },
  tschannen2020: { a: "Tschannen, M., et al.", y: 2020, t: "On mutual information maximization for representation learning", v: "ICLR", u: "https://arxiv.org/abs/1907.13625" },
  wang2020: { a: "Wang, T., & Isola, P.", y: 2020, t: "Understanding contrastive representation learning through alignment and uniformity on the hypersphere", v: "ICML", u: "https://arxiv.org/abs/2005.10242" },
  aghajanyan2021: { a: "Aghajanyan, A., et al.", y: 2021, t: "Intrinsic dimensionality explains the effectiveness of language model fine-tuning", v: "ACL-IJCNLP", u: "https://arxiv.org/abs/2012.13255" },
  bommasani2021: { a: "Bommasani, R., et al.", y: 2021, t: "On the opportunities and risks of foundation models", v: "arXiv:2108.07258", u: "https://arxiv.org/abs/2108.07258" },
  caron2021: { a: "Caron, M., et al.", y: 2021, t: "Emerging properties in self-supervised vision Transformers", v: "ICCV", u: "https://arxiv.org/abs/2104.14294" },
  chen2021b: { a: "Chen, X., et al.", y: 2021, t: "An empirical study of training self-supervised vision Transformers", v: "ICCV", u: "https://arxiv.org/abs/2104.02057" },
  dosovitskiy2021: { a: "Dosovitskiy, A., et al.", y: 2021, t: "An image is worth 16x16 words: Transformers for image recognition at scale", v: "ICLR", u: "https://arxiv.org/abs/2010.11929" },
  // Transformers beyond language (slide "Transformers beyond language"); checked 30 Sep 2026 on arXiv, PMLR and Europe PMC
  peebles2023: { a: "Peebles, W., & Xie, S.", y: 2023, t: "Scalable diffusion models with Transformers", v: "ICCV", u: "https://arxiv.org/abs/2212.09748" },
  arnab2021: { a: "Arnab, A., et al.", y: 2021, t: "ViViT: A video vision Transformer", v: "ICCV", u: "https://arxiv.org/abs/2103.15691" },
  radford2023: { a: "Radford, A., et al.", y: 2023, t: "Robust speech recognition via large-scale weak supervision", v: "ICML", u: "https://arxiv.org/abs/2212.04356" },
  nie2023: { a: "Nie, Y., et al.", y: 2023, t: "A time series is worth 64 words: Long-term forecasting with Transformers", v: "ICLR", u: "https://arxiv.org/abs/2211.14730" },
  lin2023: { a: "Lin, Z., et al.", y: 2023, t: "Evolutionary-scale prediction of atomic-level protein structure with a language model", v: "Science", u: "https://doi.org/10.1126/science.ade2574" },
  hendrycks2021: { a: "Hendrycks, D., et al.", y: 2021, t: "Measuring massive multitask language understanding", v: "ICLR", u: "https://arxiv.org/abs/2009.03300" },
  jaegle2021: { a: "Jaegle, A., et al.", y: 2021, t: "Perceiver: General perception with iterative attention", v: "ICML", u: "https://arxiv.org/abs/2103.03206" },
  lester2021: { a: "Lester, B., et al.", y: 2021, t: "The power of scale for parameter-efficient prompt tuning", v: "EMNLP", u: "https://arxiv.org/abs/2104.08691" },
  li2021a: { a: "Li, X. L., & Liang, P.", y: 2021, t: "Prefix-tuning: Optimizing continuous prompts for generation", v: "ACL-IJCNLP", u: "https://arxiv.org/abs/2101.00190" },
  liu2021: { a: "Liu, Z., et al.", y: 2021, t: "Swin Transformer: Hierarchical vision Transformer using shifted windows", v: "ICCV", u: "https://arxiv.org/abs/2103.14030" },
  narang2021: { a: "Narang, S., et al.", y: 2021, t: "Do Transformer modifications transfer across implementations and applications?", v: "EMNLP", u: "https://arxiv.org/abs/2102.11972" },
  patterson2021: { a: "Patterson, D., et al.", y: 2021, t: "Carbon emissions and large neural network training", v: "arXiv:2104.10350", u: "https://arxiv.org/abs/2104.10350" },
  radford2021: { a: "Radford, A., et al.", y: 2021, t: "Learning transferable visual models from natural language supervision", v: "ICML", u: "https://arxiv.org/abs/2103.00020" },
  zhao2021: { a: "Zhao, T. Z., et al.", y: 2021, t: "Calibrate before use: Improving few-shot performance of language models", v: "ICML", u: "https://arxiv.org/abs/2102.09690" },
  alayrac2022: { a: "Alayrac, J.-B., et al.", y: 2022, t: "Flamingo: A visual language model for few-shot learning", v: "NeurIPS", u: "https://arxiv.org/abs/2204.14198" },
  bai2022a: { a: "Bai, Y., et al.", y: 2022, t: "Training a helpful and harmless assistant with reinforcement learning from human feedback", v: "arXiv:2204.05862", u: "https://arxiv.org/abs/2204.05862" },
  bai2022b: { a: "Bai, Y., et al.", y: 2022, t: "Constitutional AI: Harmlessness from AI feedback", v: "arXiv:2212.08073", u: "https://arxiv.org/abs/2212.08073" },
  benzaken2022: { a: "Ben Zaken, E., et al.", y: 2022, t: "BitFit: Simple parameter-efficient fine-tuning for Transformer-based masked language-models", v: "ACL", u: "https://arxiv.org/abs/2106.10199" },
  fang2022: { a: "Fang, A., et al.", y: 2022, t: "Data determines distributional robustness in contrastive language image pre-training (CLIP)", v: "ICML", u: "https://arxiv.org/abs/2205.01397" },
  he2022: { a: "He, K., et al.", y: 2022, t: "Masked autoencoders are scalable vision learners", v: "CVPR", u: "https://arxiv.org/abs/2111.06377" },
  hoffmann2022: { a: "Hoffmann, J., et al.", y: 2022, t: "Training compute-optimal large language models", v: "arXiv:2203.15556", u: "https://arxiv.org/abs/2203.15556" },
  hu2022: { a: "Hu, E. J., et al.", y: 2022, t: "LoRA: Low-rank adaptation of large language models", v: "ICLR", u: "https://arxiv.org/abs/2106.09685" },
  karpathy2022: { a: "Karpathy, A.", y: 2022, t: "nanoGPT", v: "GitHub", u: "https://github.com/karpathy/nanoGPT", software: true },
  kojima2022: { a: "Kojima, T., et al.", y: 2022, t: "Large language models are zero-shot reasoners", v: "NeurIPS", u: "https://arxiv.org/abs/2205.11916" },
  lee2022: { a: "Lee, K., et al.", y: 2022, t: "Deduplicating training data makes language models better", v: "ACL", u: "https://arxiv.org/abs/2107.06499" },
  liu2022: { a: "Liu, Z., et al.", y: 2022, t: "A ConvNet for the 2020s", v: "CVPR", u: "https://arxiv.org/abs/2201.03545" },
  lu2022a: { a: "Lu, Y., et al.", y: 2022, t: "Fantastically ordered prompts and where to find them: Overcoming few-shot prompt order sensitivity", v: "ACL", u: "https://arxiv.org/abs/2104.08786" },
  min2022: { a: "Min, S., et al.", y: 2022, t: "Rethinking the role of demonstrations: What makes in-context learning work?", v: "EMNLP", u: "https://arxiv.org/abs/2202.12837" },
  openai2022: { a: "OpenAI", y: 2022, t: "Introducing ChatGPT", v: "OpenAI blog", u: "https://openai.com/index/chatgpt/" },
  ouyang2022: { a: "Ouyang, L., et al.", y: 2022, t: "Training language models to follow instructions with human feedback", v: "NeurIPS", u: "https://arxiv.org/abs/2203.02155" },
  perez2022a: { a: "Perez, F., & Ribeiro, I.", y: 2022, t: "Ignore previous prompt: Attack techniques for language models", v: "NeurIPS ML Safety Workshop", u: "https://arxiv.org/abs/2211.09527" },
  wei2022a: { a: "Wei, J., et al.", y: 2022, t: "Finetuned language models are zero-shot learners", v: "ICLR", u: "https://arxiv.org/abs/2109.01652" },
  wei2022b: { a: "Wei, J., et al.", y: 2022, t: "Chain-of-thought prompting elicits reasoning in large language models", v: "NeurIPS", u: "https://arxiv.org/abs/2201.11903" },
  wei2022c: { a: "Wei, J., et al.", y: 2022, t: "Emergent abilities of large language models", v: "Transactions on Machine Learning Research", u: "https://arxiv.org/abs/2206.07682" },
  xie2022: { a: "Xie, S. M., et al.", y: 2022, t: "An explanation of in-context learning as implicit Bayesian inference", v: "ICLR", u: "https://arxiv.org/abs/2111.02080" },
  yoo2022: { a: "Yoo, K. M., et al.", y: 2022, t: "Ground-truth labels matter: A deeper look into input-label demonstrations", v: "EMNLP", u: "https://arxiv.org/abs/2205.12685" },
  ainslie2023: { a: "Ainslie, J., et al.", y: 2023, t: "GQA: Training generalized multi-query Transformer models from multi-head checkpoints", v: "EMNLP", u: "https://arxiv.org/abs/2305.13245" },
  brohan2023: { a: "Brohan, A., et al.", y: 2023, t: "RT-2: Vision-language-action models transfer web knowledge to robotic control", v: "CoRL", u: "https://arxiv.org/abs/2307.15818" },
  bycroft2023: { a: "Bycroft, B.", y: 2023, t: "LLM visualization", v: "bbycroft.net", u: "https://bbycroft.net/llm", software: true },
  casper2023: { a: "Casper, S., et al.", y: 2023, t: "Open problems and fundamental limitations of reinforcement learning from human feedback", v: "Transactions on Machine Learning Research", u: "https://arxiv.org/abs/2307.15217" },
  dettmers2023: { a: "Dettmers, T., et al.", y: 2023, t: "QLoRA: Efficient finetuning of quantized LLMs", v: "NeurIPS", u: "https://arxiv.org/abs/2305.14314" },
  duong2023: { a: "Duong, D.", y: 2023, t: "Tiktokenizer", v: "GitHub", u: "https://github.com/dqbd/tiktokenizer", software: true },
  feng2023: { a: "Feng, G., et al.", y: 2023, t: "Towards revealing the mystery behind chain of thought: A theoretical perspective", v: "NeurIPS", u: "https://arxiv.org/abs/2305.15408" },
  gao2023: { a: "Gao, L., et al.", y: 2023, t: "Scaling laws for reward model overoptimization", v: "ICML", u: "https://arxiv.org/abs/2210.10760" },
  girdhar2023: { a: "Girdhar, R., et al.", y: 2023, t: "ImageBind: One embedding space to bind them all", v: "CVPR", u: "https://arxiv.org/abs/2305.05665" },
  greshake2023: { a: "Greshake, K., et al.", y: 2023, t: "Not what you've signed up for: Compromising real-world LLM-integrated applications with indirect prompt injection", v: "ACM Workshop on Artificial Intelligence and Security", u: "https://arxiv.org/abs/2302.12173" },
  kirstain2023: { a: "Kirstain, Y., et al.", y: 2023, t: "Pick-a-Pic: An open dataset of user preferences for text-to-image generation", v: "NeurIPS", u: "https://arxiv.org/abs/2305.01569" },
  li2023a: { a: "Li, J., et al.", y: 2023, t: "BLIP-2: Bootstrapping language-image pre-training with frozen image encoders and large language models", v: "ICML", u: "https://arxiv.org/abs/2301.12597" },
  li2023b: { a: "Li, Y., et al.", y: 2023, t: "Evaluating object hallucination in large vision-language models", v: "EMNLP", u: "https://arxiv.org/abs/2305.10355" },
  li2023c: { a: "Li, C., et al.", y: 2023, t: "LLaVA-Med: Training a large language-and-vision assistant for biomedicine in one day", v: "NeurIPS", u: "https://arxiv.org/abs/2306.00890" },
  liu2023a: { a: "Liu, H., et al.", y: 2023, t: "Visual instruction tuning", v: "NeurIPS", u: "https://arxiv.org/abs/2304.08485" },
  luccioni2023: { a: "Luccioni, A. S., et al.", y: 2023, t: "Estimating the carbon footprint of BLOOM, a 176B parameter language model", v: "Journal of Machine Learning Research", u: "https://arxiv.org/abs/2211.02001" },
  muennighoff2023: { a: "Muennighoff, N., et al.", y: 2023, t: "Scaling data-constrained language models", v: "NeurIPS", u: "https://arxiv.org/abs/2305.16264" },
  openai2023: { a: "OpenAI", y: 2023, t: "GPT-4 technical report", v: "arXiv:2303.08774", u: "https://arxiv.org/abs/2303.08774" },
  penedo2023: { a: "Penedo, G., et al.", y: 2023, t: "The RefinedWeb dataset for Falcon LLM: Outperforming curated corpora with web data, and web data only", v: "arXiv:2306.01116", u: "https://arxiv.org/abs/2306.01116" },
  petrov2023: { a: "Petrov, A., et al.", y: 2023, t: "Language model tokenizers introduce unfairness between languages", v: "NeurIPS", u: "https://arxiv.org/abs/2305.15425" },
  rafailov2023: { a: "Rafailov, R., et al.", y: 2023, t: "Direct preference optimization: Your language model is secretly a reward model", v: "NeurIPS", u: "https://arxiv.org/abs/2305.18290" },
  rahulschand2023: { a: "RahulSChand", y: 2023, t: "gpu_poor", v: "GitHub", u: "https://github.com/RahulSChand/gpu_poor", software: true },
  santurkar2023: { a: "Santurkar, S., et al.", y: 2023, t: "Whose opinions do language models reflect?", v: "ICML", u: "https://arxiv.org/abs/2303.17548" },
  schaeffer2023: { a: "Schaeffer, R., et al.", y: 2023, t: "Are emergent abilities of large language models a mirage?", v: "NeurIPS", u: "https://arxiv.org/abs/2304.15004" },
  touvron2023a: { a: "Touvron, H., et al.", y: 2023, t: "LLaMA: Open and efficient foundation language models", v: "arXiv:2302.13971", u: "https://arxiv.org/abs/2302.13971" },
  touvron2023b: { a: "Touvron, H., et al.", y: 2023, t: "Llama 2: Open foundation and fine-tuned chat models", v: "arXiv:2307.09288", u: "https://arxiv.org/abs/2307.09288" },
  turpin2023: { a: "Turpin, M., et al.", y: 2023, t: "Language models don't always say what they think: Unfaithful explanations in chain-of-thought prompting", v: "NeurIPS", u: "https://arxiv.org/abs/2305.04388" },
  wang2023a: { a: "Wang, X., et al.", y: 2023, t: "Self-consistency improves chain of thought reasoning in language models", v: "ICLR", u: "https://arxiv.org/abs/2203.11171" },
  wang2023b: { a: "Wang, Y., et al.", y: 2023, t: "Self-Instruct: Aligning language models with self-generated instructions", v: "ACL", u: "https://arxiv.org/abs/2212.10560" },
  wei2023: { a: "Wei, A., et al.", y: 2023, t: "Jailbroken: How does LLM safety training fail?", v: "NeurIPS", u: "https://arxiv.org/abs/2307.02483" },
  yang2023: { a: "Yang, J., et al.", y: 2023, t: "Set-of-Mark prompting unleashes extraordinary visual grounding in GPT-4V", v: "arXiv:2310.11441", u: "https://arxiv.org/abs/2310.11441" },
  yao2023a: { a: "Yao, S., et al.", y: 2023, t: "ReAct: Synergizing reasoning and acting in language models", v: "ICLR", u: "https://arxiv.org/abs/2210.03629" },
  yao2023b: { a: "Yao, S., et al.", y: 2023, t: "Tree of thoughts: Deliberate problem solving with large language models", v: "NeurIPS", u: "https://arxiv.org/abs/2305.10601" },
  zhou2023: { a: "Zhou, C., et al.", y: 2023, t: "LIMA: Less is more for alignment", v: "NeurIPS", u: "https://arxiv.org/abs/2305.11206" },
  besiroglu2024: { a: "Besiroglu, T., et al.", y: 2024, t: "Chinchilla scaling: A replication attempt", v: "arXiv:2404.10102", u: "https://arxiv.org/abs/2404.10102" },
  black2024: { a: "Black, K., et al.", y: 2024, t: "Training diffusion models with reinforcement learning", v: "ICLR", u: "https://arxiv.org/abs/2305.13301" },
  chameleon2024: { a: "Chameleon Team", y: 2024, t: "Chameleon: Mixed-modal early-fusion foundation models", v: "arXiv:2405.09818", u: "https://arxiv.org/abs/2405.09818" },
  chen2024a: { a: "Chen, L., et al.", y: 2024, t: "Are we on the right way for evaluating large vision-language models?", v: "NeurIPS", u: "https://arxiv.org/abs/2403.20330" },
  chiang2024: { a: "Chiang, W.-L., et al.", y: 2024, t: "Chatbot Arena: An open platform for evaluating LLMs by human preference", v: "ICML", u: "https://arxiv.org/abs/2403.04132" },
  deepseekai2024: { a: "DeepSeek-AI", y: 2024, t: "DeepSeek-V3 technical report", v: "arXiv:2412.19437", u: "https://arxiv.org/abs/2412.19437" },
  gekhman2024: { a: "Gekhman, Z., et al.", y: 2024, t: "Does fine-tuning LLMs on new knowledge encourage hallucinations?", v: "EMNLP", u: "https://arxiv.org/abs/2405.05904" },
  grattafiori2024: { a: "Grattafiori, A., et al.", y: 2024, t: "The Llama 3 herd of models", v: "arXiv:2407.21783", u: "https://arxiv.org/abs/2407.21783" },
  ho2024: { a: "Ho, A., et al.", y: 2024, t: "Algorithmic progress in language models", v: "arXiv:2403.05812", u: "https://arxiv.org/abs/2403.05812" },
  hurst2024: { a: "Hurst, A., et al. (OpenAI)", y: 2024, t: "GPT-4o system card", v: "arXiv:2410.21276", u: "https://arxiv.org/abs/2410.21276" },
  liu2024a: { a: "Liu, H., et al.", y: 2024, t: "Improved baselines with visual instruction tuning", v: "CVPR", u: "https://arxiv.org/abs/2310.03744" },
  liu2024b: { a: "Liu, J., et al.", y: 2024, t: "Infini-gram: Scaling unbounded n-gram language models to a trillion tokens", v: "COLM", u: "https://arxiv.org/abs/2401.17377" },
  longpre2024: { a: "Longpre, S., et al.", y: 2024, t: "Consent in crisis: The rapid decline of the AI data commons", v: "NeurIPS Datasets and Benchmarks Track", u: "https://arxiv.org/abs/2407.14933" },
  maaz2024: { a: "Maaz, M., et al.", y: 2024, t: "Video-ChatGPT: Towards detailed video understanding via large vision and language models", v: "ACL", u: "https://arxiv.org/abs/2306.05424" },
  oquab2024: { a: "Oquab, M., et al.", y: 2024, t: "DINOv2: Learning robust visual features without supervision", v: "Transactions on Machine Learning Research", u: "https://arxiv.org/abs/2304.07193" },
  pearce2024: { a: "Pearce, T., & Song, J.", y: 2024, t: "Reconciling Kaplan and Chinchilla scaling laws", v: "Transactions on Machine Learning Research", u: "https://arxiv.org/abs/2406.12907" },
  penedo2024: { a: "Penedo, G., et al.", y: 2024, t: "The FineWeb datasets: Decanting the web for the finest text data at scale", v: "NeurIPS Datasets and Benchmarks Track", u: "https://arxiv.org/abs/2406.17557" },
  porian2024: { a: "Porian, T., et al.", y: 2024, t: "Resolving discrepancies in compute-optimal scaling of language models", v: "NeurIPS", u: "https://arxiv.org/abs/2406.19146" },
  qi2024: { a: "Qi, X., et al.", y: 2024, t: "Fine-tuning aligned language models compromises safety, even when users do not intend to!", v: "ICLR", u: "https://arxiv.org/abs/2310.03693" },
  qi2024a: { a: "Qi, X., et al.", y: 2024, t: "Visual adversarial examples jailbreak aligned large language models", v: "AAAI", u: "https://arxiv.org/abs/2306.13213" },
  ruan2024: { a: "Ruan, C. F., et al.", y: 2024, t: "WebLLM: A high-performance in-browser LLM inference engine", v: "arXiv:2412.15803", u: "https://arxiv.org/abs/2412.15803" },
  sardana2024: { a: "Sardana, N., et al.", y: 2024, t: "Beyond Chinchilla-optimal: Accounting for inference in language model scaling laws", v: "ICML", u: "https://arxiv.org/abs/2401.00448" },
  sclar2024: { a: "Sclar, M., et al.", y: 2024, t: "Quantifying language models' sensitivity to spurious features in prompt design or: How I learned to start worrying about prompt formatting", v: "ICLR", u: "https://arxiv.org/abs/2310.11324" },
  shao2024: { a: "Shao, Z., et al.", y: 2024, t: "DeepSeekMath: Pushing the limits of mathematical reasoning in open language models", v: "arXiv:2402.03300", u: "https://arxiv.org/abs/2402.03300" },
  sharma2024: { a: "Sharma, M., et al.", y: 2024, t: "Towards understanding sycophancy in language models", v: "ICLR", u: "https://arxiv.org/abs/2310.13548" },
  singhal2024: { a: "Singhal, P., et al.", y: 2024, t: "A long way to go: Investigating length correlations in RLHF", v: "COLM", u: "https://arxiv.org/abs/2310.03716" },
  su2024: { a: "Su, J., et al.", y: 2024, t: "RoFormer: Enhanced Transformer with rotary position embedding", v: "Neurocomputing", u: "https://arxiv.org/abs/2104.09864" },
  tang2024: { a: "Tang, C., et al.", y: 2024, t: "SALMONN: Towards generic hearing abilities for large language models", v: "ICLR", u: "https://arxiv.org/abs/2310.13289" },
  toyer2024: { a: "Toyer, S., et al.", y: 2024, t: "Tensor Trust: Interpretable prompt injection attacks from an online game", v: "ICLR", u: "https://arxiv.org/abs/2311.01011" },
  wallace2024: { a: "Wallace, B., et al.", y: 2024, t: "Diffusion model alignment using direct preference optimization", v: "CVPR", u: "https://arxiv.org/abs/2311.12908" },
  wallace2024a: { a: "Wallace, E., et al.", y: 2024, t: "The instruction hierarchy: Training LLMs to prioritize privileged instructions", v: "arXiv:2404.13208", u: "https://arxiv.org/abs/2404.13208" },
  wang2024: { a: "Wang, P., et al.", y: 2024, t: "Qwen2-VL: Enhancing vision-language model's perception of the world at any resolution", v: "arXiv:2409.12191", u: "https://arxiv.org/abs/2409.12191" },
  wu2024: { a: "Wu, S., et al.", y: 2024, t: "NExT-GPT: Any-to-any multimodal LLM", v: "ICML", u: "https://arxiv.org/abs/2309.05519" },
  zhang2024a: { a: "Zhang, Z., et al.", y: 2024, t: "Multimodal chain-of-thought reasoning in language models", v: "Transactions on Machine Learning Research", u: "https://arxiv.org/abs/2302.00923" },
  zheng2024: { a: "Zheng, B., et al.", y: 2024, t: "GPT-4V(ision) is a generalist web agent, if grounded", v: "ICML", u: "https://arxiv.org/abs/2401.01614" },
  gong2025: { a: "Gong, Y., et al.", y: 2025, t: "FigStep: Jailbreaking large vision-language models via typographic visual prompts", v: "AAAI", u: "https://arxiv.org/abs/2311.05608" },
  guo2025: { a: "Guo, D., et al.", y: 2025, t: "DeepSeek-R1 incentivizes reasoning in LLMs through reinforcement learning", v: "Nature", u: "https://doi.org/10.1038/s41586-025-09422-z" },
  huggingface2025: { a: "Hugging Face", y: 2025, t: "Chat template playground", v: "Hugging Face Spaces", u: "https://huggingface.co/spaces/huggingfacejs/chat-template-playground", software: true },
  huggingface2025b: { a: "Hugging Face", y: 2025, t: "Transformers.js (Version 3.8.1)", v: "GitHub", u: "https://github.com/huggingface/transformers.js", software: true },
  lambert2025: { a: "Lambert, N., et al.", y: 2025, t: "Tulu 3: Pushing frontiers in open language model post-training", v: "COLM", u: "https://arxiv.org/abs/2411.15124" },
  liu2025: { a: "Liu, Z., et al.", y: 2025, t: "Understanding R1-Zero-like training: A critical perspective", v: "COLM", u: "https://arxiv.org/abs/2503.20783" },
  qi2025: { a: "Qi, X., et al.", y: 2025, t: "Safety alignment should be made more than just a few tokens deep", v: "ICLR", u: "https://arxiv.org/abs/2406.05946" },
  simeoni2025: { a: "Siméoni, O., et al.", y: 2025, t: "DINOv3", v: "arXiv:2508.10104", u: "https://arxiv.org/abs/2508.10104" },
  sprague2025: { a: "Sprague, Z., et al.", y: 2025, t: "To CoT or not to CoT? Chain-of-thought helps mainly on math and symbolic reasoning", v: "ICLR", u: "https://arxiv.org/abs/2409.12183" },
  tazi2025: { a: "Tazi, N., et al.", y: 2025, t: "The Ultra-Scale Playbook: Training LLMs on GPU clusters", v: "Hugging Face", u: "https://huggingface.co/spaces/nanotron/ultrascale-playbook" },
  yue2025: { a: "Yue, Y., et al.", y: 2025, t: "Does reinforcement learning really incentivize reasoning capacity in LLMs beyond the base model?", v: "NeurIPS", u: "https://arxiv.org/abs/2504.13837" },
  brown2024: { a: "Brown, B., et al.", y: 2024, t: "Large language monkeys: Scaling inference compute with repeated sampling", v: "arXiv:2407.21787", u: "https://arxiv.org/abs/2407.21787" },
  openai2024: { a: "OpenAI", y: 2024, t: "Learning to reason with LLMs", v: "OpenAI blog, 12 September", u: "https://openai.com/index/learning-to-reason-with-llms/" },
  munroe2009: { a: "Munroe, R.", y: 2009, t: "Extrapolating", v: "xkcd 605", u: "https://xkcd.com/605/" },
  munroe2014: { a: "Munroe, R.", y: 2014, t: "Tasks", v: "xkcd 1425", u: "https://xkcd.com/1425/" },
  munroe2017: { a: "Munroe, R.", y: 2017, t: "Machine learning", v: "xkcd 1838", u: "https://xkcd.com/1838/" },
  qwen2024: { a: "Qwen Team", y: 2024, t: "Qwen2.5: A party of foundation models", v: "Qwen blog, September", u: "https://qwenlm.github.io/blog/qwen2.5/" },
  socher2013: { a: "Socher, R., et al.", y: 2013, t: "Recursive deep models for semantic compositionality over a sentiment treebank", v: "EMNLP", u: "https://aclanthology.org/D13-1170/" },
  sanderson2024: { a: "Sanderson, G.", y: 2024, t: "Large language models explained briefly", v: "3Blue1Brown, YouTube video, 20 November", u: "https://www.youtube.com/watch?v=LPZh9BOjkQs" },
  wei2023b: { a: "Wei, J., et al.", y: 2023, t: "Larger language models do in-context learning differently", v: "arXiv:2303.03846", u: "https://arxiv.org/abs/2303.03846" },
  kwa2025: { a: "Kwa, T., et al.", y: 2025, t: "Measuring AI ability to complete long software tasks", v: "arXiv:2503.14499", u: "https://arxiv.org/abs/2503.14499" },
  ricouard2026: { a: "Ricouard, T.", y: 2026, t: "Architectural visualization with Astra", v: "OpenAI Developers blog, 4 September", u: "https://developers.openai.com/blog/architectural-visualization-with-astra" },
  openai2026: { a: "OpenAI", y: 2026, t: "Build agent-ready sites with WebMCP", v: "YouTube video, 25 August", u: "https://www.youtube.com/watch?v=Is2NHa7awWY" },
  snell2024: { a: "Snell, C., et al.", y: 2024, t: "Scaling LLM test-time compute optimally can be more effective than scaling model parameters", v: "arXiv:2408.03314", u: "https://arxiv.org/abs/2408.03314" },
  epochai2026: { a: "Epoch AI", y: 2026, t: "Data on AI models", v: "epoch.ai (CC BY 4.0), retrieved 29 Sep 2026", u: "https://epoch.ai/data/ai-models" },
  // Part A rebuilt around nanoGPT (6 Oct 2026). arXiv entries checked against the arXiv API that day;
  // robbins1951 and polyak1964 against their DOIs; the two ICML 2013 papers against PMLR volume 28;
  // karpathy2024 and karpathy2025 against the GitHub repos; gokaslan2019 against the corpus page.
  karpathy2024: { a: "Karpathy, A.", y: 2024, t: "build-nanogpt", v: "GitHub", u: "https://github.com/karpathy/build-nanogpt", software: true },
  karpathy2025: { a: "Karpathy, A.", y: 2025, t: "nanochat", v: "GitHub", u: "https://github.com/karpathy/nanochat", software: true },
  gokaslan2019: { a: "Gokaslan, A., & Cohen, V.", y: 2019, t: "OpenWebText corpus", v: "Dataset", u: "https://skylion007.github.io/OpenWebTextCorpus/" },
  robbins1951: { a: "Robbins, H., & Monro, S.", y: 1951, t: "A stochastic approximation method", v: "Annals of Mathematical Statistics", u: "https://doi.org/10.1214/aoms/1177729586" },
  polyak1964: { a: "Polyak, B. T.", y: 1964, t: "Some methods of speeding up the convergence of iteration methods", v: "USSR Computational Mathematics and Mathematical Physics", u: "https://doi.org/10.1016/0041-5553(64)90137-5" },
  sutskever2013: { a: "Sutskever, I., et al.", y: 2013, t: "On the importance of initialization and momentum in deep learning", v: "ICML", u: "https://proceedings.mlr.press/v28/sutskever13.html" },
  pascanu2013: { a: "Pascanu, R., et al.", y: 2013, t: "On the difficulty of training recurrent neural networks", v: "ICML", u: "https://proceedings.mlr.press/v28/pascanu13.html" },
  loshchilov2017: { a: "Loshchilov, I., & Hutter, F.", y: 2017, t: "SGDR: Stochastic gradient descent with warm restarts", v: "ICLR", u: "https://arxiv.org/abs/1608.03983" },
  goyal2017: { a: "Goyal, P., et al.", y: 2017, t: "Accurate, large minibatch SGD: Training ImageNet in 1 hour", v: "arXiv:1706.02677", u: "https://arxiv.org/abs/1706.02677" },
  mccandlish2018: { a: "McCandlish, S., et al.", y: 2018, t: "An empirical model of large-batch training", v: "arXiv:1812.06162", u: "https://arxiv.org/abs/1812.06162" },
  liu2020: { a: "Liu, L., et al.", y: 2020, t: "On the variance of the adaptive learning rate and beyond", v: "ICLR", u: "https://arxiv.org/abs/1908.03265" },
  li2020: { a: "Li, S., et al.", y: 2020, t: "PyTorch distributed: Experiences on accelerating data parallel training", v: "VLDB", u: "https://arxiv.org/abs/2006.15704" },
  dao2022: { a: "Dao, T., et al.", y: 2022, t: "FlashAttention: Fast and memory-efficient exact attention with IO-awareness", v: "NeurIPS", u: "https://arxiv.org/abs/2205.14135" },
  chowdhery2023: { a: "Chowdhery, A., et al.", y: 2023, t: "PaLM: Scaling language modeling with Pathways", v: "JMLR", u: "https://arxiv.org/abs/2204.02311" },
  // requested by the Part A builders, 6 Oct 2026: minGPT (repo LICENSE year), xkcd 1737 (its JSON), and the torch.amp page (title, "Last Updated On: Jul 11, 2026")
  karpathy2020: { a: "Karpathy, A.", y: 2020, t: "minGPT", v: "GitHub", u: "https://github.com/karpathy/minGPT", software: true },
  straycreations2023: { a: "Stray Creations", y: 2023, t: "GPT-4 addon for Blender is HERE!", v: "YouTube video, 28 March", u: "https://www.youtube.com/watch?v=xhN7P7ENu4g" }, // oEmbed title and channel; uploadDate 2023-03-28 from the watch page, 6 Oct 2026
  // Part C (6 Oct 2026), requested by its builder; checked against the arXiv API and the DOI that day
  liu2022b: { a: "Liu, H., et al.", y: 2022, t: "Few-shot parameter-efficient fine-tuning is better and cheaper than in-context learning", v: "NeurIPS", u: "https://arxiv.org/abs/2205.05638" },
  mosbach2023: { a: "Mosbach, M., et al.", y: 2023, t: "Few-shot fine-tuning vs. in-context learning: A fair comparison and evaluation", v: "Findings of ACL", u: "https://doi.org/10.18653/v1/2023.findings-acl.779" },
  munroe2007: { a: "Munroe, R.", y: 2007, t: "Compiling", v: "xkcd 303", u: "https://xkcd.com/303/" }, // xkcd JSON, 6 Oct 2026
  munroe2016: { a: "Munroe, R.", y: 2016, t: "Datacenter scale", v: "xkcd 1737", u: "https://xkcd.com/1737/" },
  pytorch2026amp: { a: "PyTorch", y: 2026, t: "Automatic mixed precision package – torch.amp", v: "PyTorch 2.14 documentation", u: "https://docs.pytorch.org/docs/2.14/amp.html" },
  cho2026: { a: "Cho, A., et al.", y: 2026, t: "Transformer Explainer: Learning LLM Transformers with interactive visual explanation and experimentation", v: "CHI", u: "https://arxiv.org/abs/2408.04619" },
  // Lecture notes rebuild (8 Oct 2026): the two lectures whose structure Parts B and C of the session-02 deck follow.
  // Author from the PDF metadata (CS336) and title page (CS224N); both URLs returned 200 on 8 Oct 2026.
  hashimoto2026: { a: "Hashimoto, T.", y: 2026, t: "Lecture 9: Scaling laws: Basics", v: "Stanford CS336, Language Modeling from Scratch", u: "https://raw.githubusercontent.com/stanford-cs336/lectures/main/lecture_09.pdf" },
  yang2026: { a: "Yang, D.", y: 2026, t: "Lecture 9: Efficient adaptation", v: "Stanford CS224N, Natural Language Processing with Deep Learning", u: "https://web.stanford.edu/class/cs224n/slides_w26/cs224n-2026-lecture09-peft.pdf" },
  // Lecture notes rebuild, session 02 (8 Oct 2026): entries requested by the six page builders; each line says how it was checked.
  pytorch2026ce: { a: "PyTorch", y: 2026, t: "CrossEntropyLoss – torch.nn", v: "PyTorch 2.14 documentation", u: "https://docs.pytorch.org/docs/2.14/generated/torch.nn.CrossEntropyLoss.html" }, // checked on the page itself (title "CrossEntropyLoss — PyTorch 2.14 documentation", HTTP 200, text on logits, targets and reduction = 'mean'), 8 Oct 2026
  narayanan2021: { a: "Narayanan, D., et al.", y: 2021, t: "Efficient large-scale language model training on GPU clusters using Megatron-LM", v: "SC21", u: "https://arxiv.org/abs/2104.04473" }, // checked on the arXiv abstract page (title, 12 authors, SC 2021) and in the PDF (§2.2.1 bubble fraction, Takeaways #1-#2), 8 Oct 2026
  dettmers2022: { a: "Dettmers, T., et al.", y: 2022, t: "8-bit optimizers via block-wise quantization", v: "ICLR", u: "https://arxiv.org/abs/2110.02861" }, // checked on the arXiv abstract page (title, first author, ICLR 2022), 8 Oct 2026
  nvidia2026a100: { a: "NVIDIA", y: 2026, t: "NVIDIA A100", v: "NVIDIA product page, retrieved 8 Oct 2026", u: "https://www.nvidia.com/en-us/data-center/a100/" }, // page title and A100 80GB SXM table (2,039 GB/s; BF16 312 TFLOPS dense, 624 with sparsity), 8 Oct 2026
  nvidia2026h100: { a: "NVIDIA", y: 2026, t: "H100 GPU", v: "NVIDIA product page, retrieved 8 Oct 2026", u: "https://www.nvidia.com/en-us/data-center/h100/" }, // page title and H100 SXM table (80 GB; 3.35 TB/s; BF16 1,979 TFLOPS with sparsity, so 989.5 dense), 8 Oct 2026
  nvidia2026fc: { a: "NVIDIA", y: 2026, t: "Linear/fully-connected layers user's guide", v: "NVIDIA Deep Learning Performance documentation, retrieved 8 Oct 2026", u: "https://docs.nvidia.com/deeplearning/performance/dl-performance-fully-connected/index.html" }, // page title; §3.2 Batch Size (4096 x 4096 layer on A100: batch sizes 128 and below are bandwidth limited), 8 Oct 2026
  nvidia2026mp: { a: "NVIDIA", y: 2026, t: "Train with mixed precision", v: "NVIDIA Deep Learning Performance documentation, retrieved 8 Oct 2026", u: "https://docs.nvidia.com/deeplearning/performance/mixed-precision-training/index.html" }, // page title; FP32 master copy of weights, FP16 = 1 sign, 5 exponent, 10 fraction bits, 8 Oct 2026
  cortes1993: { a: "Cortes, C., et al.", y: 1993, t: "Learning curves: Asymptotic values and rate of convergence", v: "NIPS", u: "https://proceedings.neurips.cc/paper/1993/hash/1aa48fc4880bb0c9b8a3bf979d3b917e-Abstract.html" }, // checked against the NeurIPS proceedings page (5 authors, volume 6, 1993) and the paper PDF, 8 Oct 2026
  banko2001: { a: "Banko, M., & Brill, E.", y: 2001, t: "Scaling to very very large corpora for natural language disambiguation", v: "ACL", u: "https://aclanthology.org/P01-1005/" }, // checked against the ACL Anthology BibTeX (39th ACL, Toulouse, July 2001) and the PDF, 8 Oct 2026
  kolachina2012: { a: "Kolachina, P., et al.", y: 2012, t: "Prediction of learning curves in machine translation", v: "ACL", u: "https://aclanthology.org/P12-1003/" }, // checked against the ACL Anthology BibTeX (50th ACL, Jeju Island, July 2012) and the PDF, 8 Oct 2026
  hestness2017: { a: "Hestness, J., et al.", y: 2017, t: "Deep learning scaling is predictable, empirically", v: "arXiv:1712.00409", u: "https://arxiv.org/abs/1712.00409" }, // checked on the arXiv abstract page (9 authors, v1 1 Dec 2017) and the PDF, 8 Oct 2026
  bahri2021: { a: "Bahri, Y., et al.", y: 2021, t: "Explaining neural scaling laws", v: "arXiv:2102.06701", u: "https://arxiv.org/abs/2102.06701" }, // checked on the arXiv abstract page (5 authors, 12 Feb 2021) and the PDF, 8 Oct 2026
  hashimoto2021: { a: "Hashimoto, T.", y: 2021, t: "Model performance scaling with multiple data sources", v: "ICML", u: "https://proceedings.mlr.press/v139/hashimoto21a.html" }, // checked on the PMLR page (PMLR 139, 1 Jul 2021) and the PDF, 8 Oct 2026; not the same work as hashimoto2026
  ruan2024a: { a: "Ruan, Y., et al.", y: 2024, t: "Observational scaling laws and the predictability of language model performance", v: "NeurIPS", u: "https://arxiv.org/abs/2405.10938" }, // checked on the arXiv abstract page (3 authors, 17 May 2024) and the PDF footer (NeurIPS 2024), 8 Oct 2026; ruan2024 is a different work (WebLLM)
  ye2024: { a: "Ye, J., et al.", y: 2024, t: "Data mixing laws: Optimizing data mixtures by predicting language modeling performance", v: "arXiv:2403.16952", u: "https://arxiv.org/abs/2403.16952" }, // checked on the arXiv abstract page (6 authors, 25 Mar 2024; v2 20 Mar 2025) and the PDF, 8 Oct 2026
  magnusson2025: { a: "Magnusson, I., et al.", y: 2025, t: "DataDecide: How to predict best pretraining data with small experiments", v: "ICML", u: "https://arxiv.org/abs/2504.11393" }, // checked on the arXiv abstract page (13 authors, 15 Apr 2025) and the PDF footer (ICML 2025, PMLR 267), 8 Oct 2026
  kim2026: { a: "Kim, K., et al.", y: 2026, t: "Pre-training under infinite compute", v: "ICLR", u: "https://proceedings.iclr.cc/paper_files/paper/2026/hash/79682ef54677a2cb3dfb8383b372037f-Abstract-Conference.html" }, // checked on the ICLR 2026 proceedings page (4 authors, 20 Apr 2026) and arXiv:2509.14786, 8 Oct 2026
  goyal2024: { a: "Goyal, S., et al.", y: 2024, t: "Scaling laws for data filtering: Data curation cannot be compute agnostic", v: "arXiv:2404.07177", u: "https://arxiv.org/abs/2404.07177" }, // checked on the arXiv abstract page (5 authors, 10 Apr 2024) and the PDF, 8 Oct 2026; the PDF names no venue
  xing2015: { a: "Xing, E. P.", y: 2015, t: "VC dimension and model complexity", v: "CMU 10-701 Machine Learning, Lecture 16, 3 November", u: "https://www.cs.cmu.edu/~epxing/Class/10701/slides/lecture16-VC.pdf" }, // checked against the PDF title slide (Fall 2015, lecture 16, 3 Nov 2015), 8 Oct 2026
  epochai2026b: { a: "Epoch AI", y: 2026, t: "Epoch Capabilities Index", v: "epoch.ai (CC BY), retrieved 8 Oct 2026", u: "https://epoch.ai/eci" }, // checked on the page: the index combines more than 50 benchmarks into one scale, 8 Oct 2026; redirected from epoch.ai/benchmarks/eci
  kennedy2025: { a: "Kennedy, P.", y: 2025, t: "Exploring the NVIDIA HGX B200 Lambda AI cluster at Cologix with Supermicro", v: "ServeTheHome, 14 August", u: "https://www.servethehome.com/exploring-the-nvidia-hgx-b200-lambda-ai-cluster-at-cologix-with-supermicro/" }, // checked on the page (author, date 14 Aug 2025; rows of 8 racks, 4 servers per rack, 8 GPUs per server), 8 Oct 2026
  rosenfeld2020: { a: "Rosenfeld, J. S., et al.", y: 2020, t: "A constructive prediction of the generalization error across scales", v: "ICLR", u: "https://arxiv.org/abs/1909.12673" }, // checked on the arXiv abstract page (title, authors, ICLR 2020), 8 Oct 2026
  tay2022a: { a: "Tay, Y., et al.", y: 2022, t: "Scaling laws vs model architectures: How does inductive bias influence scaling?", v: "arXiv:2207.10551", u: "https://arxiv.org/abs/2207.10551" }, // checked on the arXiv abstract page (v1 21 Jul 2022; no venue shown), 8 Oct 2026
  tay2022b: { a: "Tay, Y., et al.", y: 2022, t: "Scale efficiently: Insights from pre-training and fine-tuning Transformers", v: "ICLR", u: "https://arxiv.org/abs/2109.10686" }, // checked on the arXiv abstract page (title, authors, ICLR 2022), 8 Oct 2026; the deck footer links the OpenReview page
  yang2022: { a: "Yang, G., et al.", y: 2022, t: "Tensor programs V: Tuning large neural networks via zero-shot hyperparameter transfer", v: "arXiv:2203.03466", u: "https://arxiv.org/abs/2203.03466" }, // checked on the arXiv abstract page (submitted 7 Mar 2022; the page lists NeurIPS 2021), 8 Oct 2026; year 2022 follows the deck footer
  yao2024: { a: "Yao, Y., et al.", y: 2024, t: "nanoLM: An affordable LLM pre-training benchmark via accurate loss prediction across scales", v: "arXiv:2304.06875v4", u: "https://arxiv.org/abs/2304.06875v4" }, // checked on the arXiv abstract page (v1 14 Apr 2023, v4 6 Apr 2024), 8 Oct 2026; year 2024 and v4 follow the deck footer
  abnar2025: { a: "Abnar, S., et al.", y: 2025, t: "Parameters vs FLOPs: Scaling laws for optimal sparsity for mixture-of-experts language models", v: "arXiv:2501.12370", u: "https://arxiv.org/abs/2501.12370" }, // checked on the arXiv abstract page (v1 21 Jan 2025, v3 2 Jul 2025; no venue shown), 8 Oct 2026
  nye2021: { a: "Nye, M., et al.", y: 2021, t: "Show your work: Scratchpads for intermediate computation with language models", v: "arXiv:2112.00114", u: "https://arxiv.org/abs/2112.00114" }, // checked on the arXiv abstract page and API record (12 authors, v1 30 Nov 2021, no venue listed), 8 Oct 2026
  levesque2011: { a: "Levesque, H. J.", y: 2011, t: "The Winograd schema challenge", v: "AAAI Spring Symposium", u: "https://www.cs.toronto.edu/~hector/Papers/winograd.pdf" }, // checked on the PDF's first page (title, sole author, "Copyright 2011, AAAI"; URL returns 200), 8 Oct 2026
  trinh2018: { a: "Trinh, T. H., & Le, Q. V.", y: 2018, t: "A simple method for commonsense reasoning", v: "arXiv:1806.02847", u: "https://arxiv.org/abs/1806.02847" }, // checked on the arXiv abstract page and API record (2 authors, v1 7 Jun 2018), 8 Oct 2026; full and partial scoring read in the ar5iv text, §3
  see2017: { a: "See, A., et al.", y: 2017, t: "Get to the point: Summarization with pointer-generator networks", v: "ACL", u: "https://arxiv.org/abs/1704.04368" }, // checked on the arXiv abstract page and on the ACL Anthology record P17-1099 (ACL 2017, long papers, doi 10.18653/v1/P17-1099), 8 Oct 2026
  lin2004: { a: "Lin, C.-Y.", y: 2004, t: "ROUGE: A package for automatic evaluation of summaries", v: "Text Summarization Branches Out", u: "https://aclanthology.org/W04-1013/" }, // checked on the ACL Anthology record (Chin-Yew Lin, Text Summarization Branches Out, July 2004, pp. 74-81; URL returns 200), 8 Oct 2026
  zhou2022: { a: "Zhou, Y., et al.", y: 2022, t: "Large language models are human-level prompt engineers", v: "arXiv:2211.01910", u: "https://arxiv.org/abs/2211.01910" }, // checked on the arXiv abstract page and API record (7 authors, v1 3 Nov 2022); the 82.0 and 43.0 values read in the ar5iv text; the paper appeared at ICLR 2023, the course slide cites the 2022 preprint, 8 Oct 2026
  moore2024: { a: "Moore, J., et al.", y: 2024, t: "Are large language models consistent over value-laden questions?", v: "Findings of EMNLP", u: "https://arxiv.org/abs/2407.02996" }, // checked on the arXiv abstract page and API record (3 authors; comment "In Findings of EMNLP 2024"), 8 Oct 2026
  shaikh2023: { a: "Shaikh, O., et al.", y: 2023, t: "On second thought, let's not think step by step! Bias and toxicity in zero-shot reasoning", v: "ACL", u: "https://arxiv.org/abs/2212.08061" }, // checked on the arXiv abstract page and the ACL Anthology record 2023.acl-long.244 (ACL 2023, long papers, pp. 4454-4470, doi 10.18653/v1/2023.acl-long.244), 8 Oct 2026
  goodside2022: { a: "Goodside, R.", y: 2022, t: "Exploiting GPT-3 prompts with malicious inputs that order the model to ignore its previous directions", v: "X (Twitter) post, 12 September", u: "https://twitter.com/goodside/status/1569128808308957185" }, // tweet text and date as quoted in Simon Willison's post of 12 Sep 2022 (simonwillison.net/2022/Sep/12/prompt-injection/, URL returns 200); post date also decoded from the tweet id (12 Sep 2022 UTC); the X page itself needs a login, 8 Oct 2026
  zou2023: { a: "Zou, A., et al.", y: 2023, t: "Universal and transferable adversarial attacks on aligned language models", v: "arXiv:2307.15043", u: "https://arxiv.org/abs/2307.15043" }, // checked on the arXiv abstract page and API record (6 authors, v1 27 Jul 2023), 8 Oct 2026
  he2022unified: { a: "He, J., et al.", y: 2022, t: "Towards a unified view of parameter-efficient transfer learning", v: "ICLR", u: "https://arxiv.org/abs/2110.04366" }, // checked arXiv abstract page and the PDF (title, five authors with Junxian He first, "Published as a conference paper at ICLR 2022"), 8 Oct 2026. The key he2022 is taken by "Masked autoencoders" (He, K.), so this one has its own key.
  ruder2022: { a: "Ruder, S., et al.", y: 2022, t: "Modular and parameter-efficient fine-tuning for NLP models", v: "EMNLP, Tutorial Abstracts", u: "https://aclanthology.org/2022.emnlp-tutorials.5/" }, // checked ACL Anthology page (authors Ruder, Pfeiffer, Vulić; EMNLP 2022 Tutorial Abstracts, December 2022) and modulardeeplearning.com (tutorial title), 8 Oct 2026
  schwartz2019: { a: "Schwartz, R., et al.", y: 2019, t: "Green AI", v: "arXiv:1907.10597", u: "https://arxiv.org/abs/1907.10597" }, // checked arXiv abstract page (four authors, 2019) and the PDF (Figure 2 and its text, p. 3), 8 Oct 2026
  schulman2025: { a: "Schulman, J., & Thinking Machines Lab", y: 2025, t: "LoRA without regret", v: "Connectionism, 29 September", u: "https://thinkingmachines.ai/blog/lora/" }, // checked the post itself (title, byline "John Schulman in collaboration with others at Thinking Machines Lab", date 29 Sep 2025), 8 Oct 2026; the blog name "Connectionism" is taken from the deck's footer, not from the page text I fetched
  // Lecture 2 session 01 deck, Part B (8 Oct 2026, session "CEG 5305 lec2s1"): requested by its builder; each line says how it was checked.
  yang2026b: { a: "Yang, D.", y: 2026, t: "Post-training (RLHF, SFT, DPO)", v: "Stanford CS224N, Natural Language Processing with Deep Learning, 29 January", u: "https://web.stanford.edu/class/cs224n/slides_w26/cs224n-2026-lecture08-posttraining.pdf" }, // PDF HTTP 200; title and date from the CS224N schedule page ("Thu Jan 29 Post-training (RLHF, SFT, DPO)"); the PDF's title slide says "Lecture 7: Post-training", the file name says lecture08; author Diyi Yang (title slide)
  hashimoto2026b: { a: "Hashimoto, T.", y: 2026, t: "Lecture 15: After pretraining (mid/post training)", v: "Stanford CS336, Language Modeling from Scratch", u: "https://raw.githubusercontent.com/stanford-cs336/lectures/main/lecture_15.pdf" }, // PDF HTTP 200; title from p. 1 ("Lecture 15 'After pretraining' (mid/post training)"); author from the PDF metadata (Tatsu Hashimoto)
  chung2022: { a: "Chung, H. W., et al.", y: 2022, t: "Scaling instruction-finetuned language models", v: "arXiv:2210.11416", u: "https://arxiv.org/abs/2210.11416" }, // arXiv API: 35 authors, first author Hyung Won Chung, v1 20 Oct 2022
  wang2022: { a: "Wang, Y., et al.", y: 2022, t: "Super-NaturalInstructions: Generalization via declarative instructions on 1600+ NLP tasks", v: "EMNLP", u: "https://arxiv.org/abs/2204.07705" }, // arXiv API; comment "Accepted to EMNLP 2022"
  srivastava2022: { a: "Srivastava, A., et al.", y: 2022, t: "Beyond the imitation game: Quantifying and extrapolating the capabilities of language models", v: "Transactions on Machine Learning Research", u: "https://arxiv.org/abs/2206.04615" }, // arXiv API: 451 authors; journal-ref reads "Transactions on Machine Learning Research, May/2022"; year as in the deck and the journal-ref
  taori2023: { a: "Taori, R., et al.", y: 2023, t: "Alpaca: A strong, replicable instruction-following model", v: "Stanford CRFM blog, 13 March", u: "https://crfm.stanford.edu/2023/03/13/alpaca.html" }, // page HTTP 200; title and the 8 authors (Taori … Hashimoto) read from the page
  sutton1998: { a: "Sutton, R. S., & Barto, A. G.", y: 1998, t: "Reinforcement learning: An introduction", v: "MIT Press", u: "http://incompleteideas.net/book/first/the-book.html" }, // first edition, as the deck cites 1998; the authors' page for it returns HTTP 200
  mnih2013: { a: "Mnih, V., et al.", y: 2013, t: "Playing Atari with deep reinforcement learning", v: "NIPS Deep Learning Workshop", u: "https://arxiv.org/abs/1312.5602" }, // arXiv API; comment "NIPS Deep Learning Workshop 2013"
  silver2016: { a: "Silver, D., et al.", y: 2016, t: "Mastering the game of Go with deep neural networks and tree search", v: "Nature", u: "https://doi.org/10.1038/nature16961" }, // Crossref: 20 authors, Nature, 27 Jan 2016
  ziegler2019: { a: "Ziegler, D. M., et al.", y: 2019, t: "Fine-tuning language models from human preferences", v: "arXiv:1909.08593", u: "https://arxiv.org/abs/1909.08593" }, // arXiv API: 8 authors, 18 Sep 2019
  knox2009: { a: "Knox, W. B., & Stone, P.", y: 2009, t: "Interactively shaping agents via human reinforcement", v: "International Conference on Knowledge Capture (K-CAP)", u: "https://doi.org/10.1145/1597735.1597738" }, // Crossref: authors W. Bradley Knox, Peter Stone; title exactly as in Crossref; Crossref container: Proceedings of the fifth international conference on Knowledge capture, Sep 2009
  phelps2015: { a: "Phelps, A. S., et al.", y: 2015, t: "Pairwise comparison versus Likert scale for biomedical image assessment", v: "American Journal of Roentgenology", u: "https://doi.org/10.2214/AJR.14.13022" }, // Crossref: 7 authors, first Andrew S. Phelps, Jan 2015
  clark2018: { a: "Clark, E., et al.", y: 2018, t: "Creative writing with a machine in the loop", v: "IUI", u: "https://doi.org/10.1145/3172944.3172983" }, // Crossref: 5 authors, first Clark, 23rd International Conference on Intelligent User Interfaces, 5 Mar 2018; title exactly as in Crossref
  openai2022b: { a: "OpenAI", y: 2022, t: "Aligning language models to follow instructions", v: "OpenAI blog, 27 January", u: "https://openai.com/index/instruction-following/" }, // openai.com returns HTTP 403 to curl and WebFetch; title, date and URL from a web-search listing of the page, 8 Oct 2026
  clark2016: { a: "Clark, J., & Amodei, D.", y: 2016, t: "Faulty reward functions in the wild", v: "OpenAI blog", u: "https://openai.com/index/faulty-reward-functions/" }, // openai.com returns HTTP 403; title, authors, year and URL from a web-search listing, 8 Oct 2026. The CoastRunners video (YouTube tlOIHko8ySg, "CoastRunners 7", channel Jack Clark) checked by YouTube oEmbed
  olson2023: { a: "Olson, E.", y: 2023, t: "Google shares drop $100 billion after its new AI chatbot makes a mistake", v: "NPR, 9 February", u: "https://www.npr.org/2023/02/09/1155650909/google-chatbot--error-bard-shares" }, // page HTTP 200; og:title, author (Emily Olson) and datePublished 2023-02-09 from the page
  dubois2023: { a: "Dubois, Y., et al.", y: 2023, t: "AlpacaFarm: A simulation framework for methods that learn from human feedback", v: "NeurIPS", u: "https://arxiv.org/abs/2305.14387" }, // arXiv API; comment "Spotlight at NeurIPS 2023"
  zheng2023: { a: "Zheng, R., et al.", y: 2023, t: "Secrets of RLHF in large language models Part I: PPO", v: "arXiv:2307.04964", u: "https://arxiv.org/abs/2307.04964" }, // arXiv API: 27 authors, 11 Jul 2023
  ethayarajh2024: { a: "Ethayarajh, K., et al.", y: 2024, t: "KTO: Model alignment as prospect theoretic optimization", v: "ICML", u: "https://arxiv.org/abs/2402.01306" }, // arXiv API; journal-ref "ICML 2024"
  azar2023: { a: "Azar, M. G., et al.", y: 2023, t: "A general theoretical paradigm to understand learning from human preferences", v: "arXiv:2310.12036", u: "https://arxiv.org/abs/2310.12036" }, // arXiv API: 7 authors, v1 18 Oct 2023 (the arXiv record names no venue)
  perrigo2023: { a: "Perrigo, B.", y: 2023, t: "Exclusive: OpenAI used Kenyan workers on less than $2 per hour to make ChatGPT less toxic", v: "TIME, 18 January", u: "https://time.com/6247678/openai-chatgpt-kenya-workers/" }, // time.com returns HTTP 406 to curl; title, author, date and URL from web-search listings, 8 Oct 2026
  rowe2023: { a: "Rowe, N.", y: 2023, t: "Millions of workers are training AI models for pennies", v: "WIRED, 12 October", u: "https://www.wired.com/story/millions-of-workers-are-training-ai-models-for-pennies/" }, // page HTTP 200; title, author (Niamh Rowe) and datePublished 2023-10-12 from the page
  tan2023: { a: "Tan, R., & Cabato, R.", y: 2023, t: "Behind the AI boom, an army of overseas workers in 'digital sweatshops'", v: "The Washington Post, 28 August", u: "https://www.washingtonpost.com/world/2023/08/28/scale-ai-remotasks-philippines-artificial-intelligence/" }, // washingtonpost.com did not answer curl; title, authors and month from web-search listings, 8 Oct 2026; the day (28) is from the URL path
  ryan2024: { a: "Ryan, M. J., et al.", y: 2024, t: "Unintended impacts of LLM alignment on global representation", v: "ACL", u: "https://arxiv.org/abs/2402.15018" }, // arXiv API: 3 authors; comment "Accepted to ACL 2024 main conference"
  huang2022: { a: "Huang, J., et al.", y: 2022, t: "Large language models can self-improve", v: "arXiv:2210.11610", u: "https://arxiv.org/abs/2210.11610" }, // arXiv API: 7 authors, 20 Oct 2022
  zelikman2022: { a: "Zelikman, E., et al.", y: 2022, t: "STaR: Bootstrapping reasoning with reasoning", v: "arXiv:2203.14465", u: "https://arxiv.org/abs/2203.14465" }, // arXiv API: 4 authors, 28 Mar 2022 (the arXiv record names no venue)
  hu2024: { a: "Hu, S., et al.", y: 2024, t: "MiniCPM: Unveiling the potential of small language models with scalable training strategies", v: "arXiv:2404.06395", u: "https://arxiv.org/abs/2404.06395" }, // arXiv API: 25 authors, v1 9 Apr 2024
  shen2024: { a: "Shen, Y., et al.", y: 2024, t: "JetMoE: Reaching Llama2 performance with 0.1M dollars", v: "arXiv:2404.07413", u: "https://arxiv.org/abs/2404.07413" }, // arXiv API: 4 authors, 11 Apr 2024
  munroe2024: { a: "Munroe, R.", y: 2024, t: "Goodhart's law", v: "xkcd 2899", u: "https://xkcd.com/2899/" }, // xkcd JSON (https://xkcd.com/2899/info.0.json): title, 26 Feb 2024; image goodharts_law_2x.png saved to slides/assets/partB/
  // Lecture 2 session 02 deck frame (8 Oct 2026, session "CEG 5305 lec2s2"): the outline pages' references; each line says how it was checked.
  liu2023: { a: "Liu, P., et al.", y: 2023, t: "Pre-train, prompt, and predict: A systematic survey of prompting methods in natural language processing", v: "ACM Computing Surveys", u: "https://doi.org/10.1145/3560815" }, // Crossref 10.1145/3560815: title, ACM Computing Surveys, published 16 Jan 2023, authors Liu, Yuan, Fu, Jiang, Hayashi, Neubig; arXiv:2107.13586 v1 28 Jul 2021. Not liu2021 (= Swin)
  liu2024c: { a: "Liu, R., et al.", y: 2024, t: "Mind your step (by step): Chain-of-thought can reduce performance on tasks where thinking makes humans worse", v: "arXiv:2410.21333", u: "https://arxiv.org/abs/2410.21333" }, // arXiv abs page: title, first version 27 Oct 2024; PDF v4 (13 Jun 2025) title page: Ryan Liu, Jiayi Geng, Addison J. Wu, Ilia Sucholutsky, Tania Lombrozo, Thomas L. Griffiths
  chen2025: { a: "Chen, Y., et al.", y: 2025, t: "Reasoning models don't always say what they think", v: "arXiv:2505.05410", u: "https://arxiv.org/abs/2505.05410" }, // arXiv abs page: title, 8 May 2025; PDF v1 title page: Yanda Chen, Joe Benton, Ansh Radhakrishnan et al. (Anthropic)
  yao2024b: { a: "Yao, S., et al.", y: 2024, t: "τ-bench: A benchmark for tool-agent-user interaction in real-world domains", v: "arXiv:2406.12045", u: "https://arxiv.org/abs/2406.12045" }, // arXiv abs page: title, 17 Jun 2024; PDF v1 title page: Shunyu Yao, Noah Shinn, Pedram Razavi, Karthik Narasimhan. yao2024 is nanoLM
  sinha2026: { a: "Sinha, A., et al.", y: 2026, t: "The illusion of diminishing returns: Measuring long horizon execution in LLMs", v: "ICLR", u: "https://arxiv.org/abs/2509.09677" }, // arXiv abs page: title, 11 Sep 2025, comment "Published at ICLR 2026"; PDF v3 title page: Akshit Sinha, Arvindh Arun, Shashwat Goel, Steffen Staab, Jonas Geiping
  luo2025: { a: "Luo, H., et al.", y: 2025, t: "UltraHorizon: Benchmarking agent capabilities in ultra long-horizon scenarios", v: "arXiv:2509.21766", u: "https://arxiv.org/abs/2509.21766" }, // arXiv abs page: title, 26 Sep 2025; PDF v1 title page: Haotian Luo, Huaisong Zhang, Xuelin Zhang, Haoyu Wang, Zeyu Qin et al. (18 authors)
  kimiteam2026: { a: "Kimi Team", y: 2026, t: "Kimi K3: Open frontier intelligence", v: "arXiv:2607.24653", u: "https://arxiv.org/abs/2607.24653" }, // arXiv abs page: title, 27 Jul 2026, comment "K3 tech report"; PDF v2 (7 Aug 2026) title page: author "Kimi Team"
  // Lecture 2 session 01 deck, Part A (8 Oct 2026, session "CEG 5305 lec2s1"): requested by its builder; each line says how it was checked.
  lambert2026l1: { a: "Lambert, N.", y: 2026, t: "Lecture 1: Overview", v: "RLHF Book course (post-training course, chapters 1–3)", u: "https://rlhfbook.com/teach/course/lec1-chap1-3/slides.pdf" }, // PDF HTTP 200; title from p. 1 and the PDF metadata ("Lecture 1: Overview"), author Nathan Lambert (p. 1), PDF built 24 Sep 2026
  sanh2022: { a: "Sanh, V., et al.", y: 2022, t: "Multitask prompted training enables zero-shot task generalization", v: "ICLR", u: "https://arxiv.org/abs/2110.08207" }, // arXiv API: 41 authors, first Victor Sanh, v1 15 Oct 2021; comment "ICLR 2022 Spotlight"; licence CC BY 4.0
  warstadt2023: { a: "Warstadt, A., et al.", y: 2023, t: "Call for papers – The BabyLM Challenge: Sample-efficient pretraining on a developmentally plausible corpus", v: "arXiv:2301.11796", u: "https://arxiv.org/abs/2301.11796" }, // arXiv API: 6 authors, first Alex Warstadt, 27 Jan 2023; licence CC BY 4.0
  meta2024: { a: "Meta", y: 2024, t: "Llama-3.2-1B-Instruct", v: "Hugging Face model page", u: "https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct" }, // page HTTP 200 (title "meta-llama/Llama-3.2-1B-Instruct · Hugging Face"); parameter count 1,235,814,400 and creation date 18 Sep 2024 from the Hub API (huggingface.co/api/models/meta-llama/Llama-3.2-1B-Instruct)
  allenai2025: { a: "Allen Institute for AI", y: 2025, t: "OLMoE-1B-7B-0125-Instruct", v: "Hugging Face model card", u: "https://huggingface.co/allenai/OLMoE-1B-7B-0125-Instruct" }, // README read with curl: Performance table (Avg. 45.62 vs 38.44 for 0924-Instruct; MMLU, IFEval, GSM8K rows); Hub API createdAt 27 Jan 2025. Base-model cards (allenai/OLMoE-1B-7B-0924 and -0125) both say main = step1200000-tokens5033B annealed for 100B more tokens; the 0125 card lists dolmino-mix-1124
  munroe2015: { a: "Munroe, R.", y: 2015, t: "The three laws of robotics", v: "xkcd 1613", u: "https://xkcd.com/1613/" }, // xkcd JSON (https://xkcd.com/1613/info.0.json): title "The Three Laws of Robotics", 7 Dec 2015; image the_three_laws_of_robotics_2x.png (HTTP 200) saved to slides/assets/partA/
  openai2026spec: { a: "OpenAI", y: 2026, t: "Model Spec (2026/08/18)", v: "model-spec.openai.com", u: "https://model-spec.openai.com/2026-08-18.html" }, // page HTTP 200; title "Model Spec (2026/08/18)"; model-spec.openai.com redirects to this version; text checked for "chain of command" and "We are training our models to align to the principles in the Model Spec"
  anthropic2026const: { a: "Anthropic", y: 2026, t: "Claude's constitution", v: "anthropic.com", u: "https://www.anthropic.com/constitution" }, // page HTTP 200, title "Claude's Constitution \ Anthropic"; priority order quoted on the slide checked in the page text; year 2026 from the RLHF Book course L13 p. 19 ("January 2026") and the dates in the page source
  // Lecture 2 session 01 deck, Part C (8 Oct 2026, session "CEG 5305 lec2s1"): requested by its builder; each line says how it was checked.
  schick2023: { a: "Schick, T., et al.", y: 2023, t: "Toolformer: Language models can teach themselves to use tools", v: "NeurIPS", u: "https://arxiv.org/abs/2302.04761" }, // arXiv API: 8 authors, v1 9 Feb 2023; NeurIPS 2023 per the reference list of L11 p. 41 (Lambert, 2026); PDF = papers/schick-2023-toolformer.pdf
  rottger2024: { a: "Röttger, P., et al.", y: 2024, t: "XSTest: A test suite for identifying exaggerated safety behaviours in large language models", v: "NAACL", u: "https://arxiv.org/abs/2308.01263" }, // arXiv API: 6 authors, v1 2 Aug 2023, comment "Accepted at NAACL 2024 (Main Conference)"; PDF v3 = papers/rottger-2024-xstest.pdf
  yang2025: { a: "Yang, A., et al.", y: 2025, t: "Qwen3 technical report", v: "arXiv:2505.09388", u: "https://arxiv.org/abs/2505.09388" }, // arXiv API: 60 authors, first An Yang, v1 14 May 2025; PDF = papers/yang-2025-qwen3.pdf
  kimiteam2025: { a: "Kimi Team", y: 2025, t: "Kimi K2: Open agentic intelligence", v: "arXiv:2507.20534", u: "https://arxiv.org/abs/2507.20534" }, // arXiv API: author list starts "Kimi Team", v1 28 Jul 2025, comment "tech report of Kimi K2"; PDF v2 = papers/kimiteam-2025-kimi-k2.pdf
  kimiteam2026b: { a: "Kimi Team", y: 2026, t: "Kimi K2.5: Visual agentic intelligence", v: "arXiv:2602.02276", u: "https://arxiv.org/abs/2602.02276" }, // arXiv API: author list starts "Kimi Team", v1 2 Feb 2026, comment "Kimi K2.5 tech report"; PDF v2 = papers/kimiteam-2026-kimi-k2.5.pdf
  glm5team2026: { a: "GLM-5 Team", y: 2026, t: "GLM-5: From vibe coding to agentic engineering", v: "arXiv:2602.15763", u: "https://arxiv.org/abs/2602.15763" }, // arXiv API: author list starts "GLM-5-Team", v1 17 Feb 2026; PDF v2 = papers/glm5team-2026-glm-5.pdf
  raoof2026: { a: "Raoof, N., et al.", y: 2026, t: "OpenThoughts-Agent: Data recipes for agentic models", v: "arXiv:2606.24855", u: "https://arxiv.org/abs/2606.24855" }, // arXiv API: 50 authors, first Negin Raoof, v1 23 Jun 2026; PDF = papers/raoof-2026-openthoughts-agent.pdf
  ivison2026: { a: "Ivison, H., et al.", y: 2026, t: "Tmax: A simple recipe for terminal agents", v: "arXiv:2606.23321", u: "https://arxiv.org/abs/2606.23321" }, // arXiv API: 6 authors, first Hamish Ivison, v1 22 Jun 2026, comment "preprint"; PDF = papers/ivison-2026-tmax.pdf (the PDF styles the name TMAX)
  xu2026: { a: "Xu, B., et al.", y: 2026, t: "Polar: Agentic RL on any harness at scale", v: "arXiv:2605.24220", u: "https://arxiv.org/abs/2605.24220" }, // arXiv API: 12 authors, first Binfeng Xu, v1 22 May 2026; PDF = papers/xu-2026-polar.pdf
  nvidia2026ultra: { a: "NVIDIA", y: 2026, t: "Nemotron 3 Ultra: Open, efficient mixture-of-experts hybrid Mamba-Transformer model for agentic reasoning", v: "arXiv:2606.15007", u: "https://arxiv.org/abs/2606.15007" }, // arXiv API: author list starts "NVIDIA", v1 12 Jun 2026; PDF = papers/nvidia-2026-nemotron-3-ultra.pdf
  anthropic2024: { a: "Anthropic", y: 2024, t: "Introducing computer use, a new Claude 3.5 Sonnet, and Claude 3.5 Haiku", v: "Anthropic news, 22 October", u: "https://www.anthropic.com/news/3-5-models-and-computer-use" }, // curl: <title> and datePublished 2024-10-22
  anthropic2024b: { a: "Anthropic", y: 2024, t: "Developing a computer use model", v: "Anthropic news, 22 October", u: "https://www.anthropic.com/news/developing-computer-use" }, // curl: <title> and datePublished 2024-10-22
  anthropic2024c: { a: "Anthropic", y: 2024, t: "Claude | Computer use for coding", v: "YouTube video, 22 October", u: "https://www.youtube.com/watch?v=vH2f7cjXjKI" }, // oEmbed: title, channel Anthropic; watch page: uploadDate 2024-10-22, lengthSeconds 183, chapter "Create a personal homepage" at 0:23
  anthropic2024d: { a: "Anthropic", y: 2024, t: "Claude's character", v: "Anthropic research, 8 June", u: "https://www.anthropic.com/research/claude-character" }, // curl: <title> "Claude’s Character", datePublished 2024-06-08; the pipeline and the quote “only synthetic data generated by Claude itself” read in the page text
  lambert2026c01: { a: "Lambert, N., & Timbers, F.", y: 2026, t: "Frontier post-training recipe survey", v: "RLHF Book course, Conversation 1", u: "https://rlhfbook.com/teach/course/conversation-01/slides.pdf" }, // title slide (June 2026; PDF built 24 Sep 2026); URL returns 200, 8 Oct 2026
  lambert2026l11: { a: "Lambert, N.", y: 2026, t: "Basics of LLM tool use and the road to today's agents", v: "RLHF Book course, Lecture 11", u: "https://rlhfbook.com/teach/course/lec11-chap13-tools/slides.pdf" }, // title slide; URL returns 200, 8 Oct 2026
  lambert2026l13: { a: "Lambert, N.", y: 2026, t: "An introduction to character training", v: "RLHF Book course, Lecture 13", u: "https://rlhfbook.com/teach/course/lec13-chap17-character/slides.pdf" }, // title slide; URL returns 200, 8 Oct 2026
  dubois2025: { a: "Dubois, Y.", y: 2025, t: "Introduction to training LLMs for AI agents", v: "UC Berkeley CS294/194-196, Agentic AI, 15 September", u: "https://rdi.berkeley.edu/agentic-ai/slides/lecture1.pdf" }, // title slide; date from the course page (references/README.md); URL returns 200, 8 Oct 2026
  // Lecture 2 session 02 (9 Oct 2026, session "CEG 5305 lec2s2"): the two lectures whose content Parts B and C of the deck follow.
  chen2025b: { a: "Chen, X.", y: 2025, t: "Inference-time techniques for LLM reasoning", v: "UC Berkeley CS294/194-280, Advanced Large Language Model Agents, 27 January", u: "https://rdi.berkeley.edu/adv-llm-agents/slides/inference_time_techniques_lecture_sp25.pdf" }, // title page of the PDF (74 pp.); URL returned 200 on 9 Oct 2026; date from the course schedule (references/README.md)
  fried2026: { a: "Fried, D., & Neubig, G.", y: 2026, t: "What are agents? And how do they work?", v: "CMU 11-768, AI Agents, lecture 1, 25 August", u: "https://www.cmu-agents.com/slides/lecture-01-agents.pdf" }, // title page of the PDF (39 pp.; author order as printed there); URL returned 200 on 9 Oct 2026; date from the course schedule
};

const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// one APA reference as HTML; the title links to the paper
export function apa(key, newTab = false) {
  const r = BIB[key];
  if (!r) return `<span class="missing">missing reference: ${esc(key)}</span>`;
  const tgt = newTab ? ` target="_blank" rel="noopener"` : "";
  const title = `<a href="${r.u}"${tgt}>${esc(r.t)}</a>`;
  return r.software
    ? `${esc(r.a)} (${r.y}). <i>${title}</i> [Computer software]. ${esc(r.v)}.`
    : `${esc(r.a)} (${r.y}). ${title}${/[.?!]$/.test(r.t) ? "" : "."} <i>${esc(r.v)}</i>.`; // APA: no period after a title ending in ? or !
}

// APA orders a reference list by first author, then year
// (an unknown key sorts by its own name and renders as "missing reference")
export const sortRefs = keys => [...new Set(keys)]
  .sort((p, q) => (BIB[p]?.a ?? p).localeCompare(BIB[q]?.a ?? q) || (BIB[p]?.y ?? 0) - (BIB[q]?.y ?? 0));

// give every <a data-ref> its link and the full reference as a tooltip
export function linkCites(root = document, newTab = false) {
  root.querySelectorAll("a[data-ref]").forEach(a => {
    const r = BIB[a.dataset.ref];
    if (!r) { a.classList.add("missing"); console.warn("missing reference", a.dataset.ref); return; }
    a.href = r.u;
    a.title = `${r.a} (${r.y}). ${r.t}.`;
    if (newTab) { a.target = "_blank"; a.rel = "noopener"; }
  });
}
