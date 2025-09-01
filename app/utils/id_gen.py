import threading
import time


class Snowflake:
    def __init__(self, datacenter_id: int = 1, worker_id: int = 1) -> None:
        self.twepoch = 1609459200000  # 2021-01-01
        self.datacenter_id_bits = 5
        self.worker_id_bits = 5
        self.sequence_bits = 12

        self.max_datacenter_id = -1 ^ (-1 << self.datacenter_id_bits)
        self.max_worker_id = -1 ^ (-1 << self.worker_id_bits)

        if datacenter_id > self.max_datacenter_id or datacenter_id < 0:
            raise ValueError("datacenter_id out of range")
        if worker_id > self.max_worker_id or worker_id < 0:
            raise ValueError("worker_id out of range")

        self.datacenter_id = datacenter_id
        self.worker_id = worker_id
        self.sequence = 0
        self.last_timestamp = -1
        self.lock = threading.Lock()

        self.worker_id_shift = self.sequence_bits
        self.datacenter_id_shift = self.sequence_bits + self.worker_id_bits
        self.timestamp_left_shift = self.sequence_bits + self.worker_id_bits + self.datacenter_id_bits
        self.sequence_mask = -1 ^ (-1 << self.sequence_bits)

    def _time_gen(self) -> int:
        return int(time.time() * 1000)

    def _til_next_millis(self, last_timestamp: int) -> int:
        timestamp = self._time_gen()
        while timestamp <= last_timestamp:
            timestamp = self._time_gen()
        return timestamp

    def get_id(self) -> int:
        with self.lock:
            timestamp = self._time_gen()
            if timestamp < self.last_timestamp:
                # clock moved backwards, wait
                timestamp = self._til_next_millis(self.last_timestamp)

            if self.last_timestamp == timestamp:
                self.sequence = (self.sequence + 1) & self.sequence_mask
                if self.sequence == 0:
                    timestamp = self._til_next_millis(self.last_timestamp)
            else:
                self.sequence = 0

            self.last_timestamp = timestamp
            return (
                ((timestamp - self.twepoch) << self.timestamp_left_shift)
                | (self.datacenter_id << self.datacenter_id_shift)
                | (self.worker_id << self.worker_id_shift)
                | self.sequence
            )


_sf = Snowflake()


def generate_id() -> int:
    return _sf.get_id()


