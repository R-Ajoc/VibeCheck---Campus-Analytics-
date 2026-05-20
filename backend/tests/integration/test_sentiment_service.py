from backend.app.services.sentiment_service import analyze_sentiment, analyze_sentiment_batch


class FakeSinglePipeline:
	def __init__(self, label: str, score: float):
		self.label = label
		self.score = score
		self.calls = []

	def __call__(self, text, **kwargs):
		self.calls.append((text, kwargs))
		return [{"label": self.label, "score": self.score}]


class FakeBatchPipeline:
	def __init__(self, outputs):
		self.outputs = outputs
		self.calls = []

	def __call__(self, texts, **kwargs):
		self.calls.append((texts, kwargs))
		return self.outputs


def test_analyze_sentiment_maps_positive_pipeline_output():
	pipeline = FakeSinglePipeline("POSITIVE", 0.93)

	score, label, confidence = analyze_sentiment("Great service", pipeline)

	assert label == "positive"
	assert score == 0.93
	assert confidence == 0.93
	assert pipeline.calls[0][1]["truncation"] is True
	assert pipeline.calls[0][1]["max_length"] == 512


def test_analyze_sentiment_maps_negative_pipeline_output():
	pipeline = FakeSinglePipeline("NEGATIVE", 0.81)

	score, label, confidence = analyze_sentiment("Terrible staff", pipeline)

	assert label == "negative"
	assert score == -0.81
	assert confidence == 0.81


def test_analyze_sentiment_batch_maps_all_labels_and_preserves_order():
	pipeline = FakeBatchPipeline(
		[
			{"label": "POSITIVE", "score": 0.9},
			{"label": "NEGATIVE", "score": 0.7},
		]
	)

	results = analyze_sentiment_batch(["a", "b"], pipeline)

	assert results == [
		(0.9, "positive", 0.9),
		(-0.7, "negative", 0.7),
	]
	assert pipeline.calls[0][1]["truncation"] is True
	assert pipeline.calls[0][1]["max_length"] == 512
