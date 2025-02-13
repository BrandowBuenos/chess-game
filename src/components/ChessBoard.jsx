import React, { useState, useEffect } from "react";
import ChessPiece from "./ChessPiece";

const initialBoard = [
  [
    "Brook",
    "Bknight",
    "Bbishop",
    "Bqueen",
    "Bking",
    "Bbishop",
    "Bknight",
    "Brook",
  ],
  ["Bpawn", "Bpawn", "Bpawn", "Bpawn", "Bpawn", "Bpawn", "Bpawn", "Bpawn"],
  Array(8).fill(""),
  Array(8).fill(""),
  Array(8).fill(""),
  Array(8).fill(""),
  ["Wpawn", "Wpawn", "Wpawn", "Wpawn", "Wpawn", "Wpawn", "Wpawn", "Wpawn"],
  [
    "Wrook",
    "Wknight",
    "Wbishop",
    "Wqueen",
    "Wking",
    "Wbishop",
    "Wknight",
    "Wrook",
  ],
];

const promotionOptions = ["queen", "rook", "bishop", "knight"];

const PromotionModal = ({ onSelect, color }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-4 rounded shadow-lg">
        <h2 className="text-lg font-bold mb-2">Select Promotion</h2>
        <div className="flex gap-2">
          {promotionOptions.map((option) => (
            <button
              key={option}
              className="p-2 border rounded bg-gray-200 hover:bg-gray-400"
              onClick={() => onSelect(`${color}${option}`)}
            >
              <ChessPiece piece={`${color}${option}`} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const ChessBoard = () => {
  const [board, setBoard] = useState(initialBoard);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [turn, setTurn] = useState("W");
  const [gameStatus, setGameStatus] = useState("ongoing");
  const [promotionSquare, setPromotionSquare] = useState(null);

  const [castlingRights, setCastlingRights] = useState({
    W: { kingSide: true, queenSide: true },
    B: { kingSide: true, queenSide: true },
  });
  const [enPassantTarget, setEnPassantTarget] = useState(null);
  const [capturedPieces, setCapturedPieces] = useState({ W: [], B: [] });

  useEffect(() => {
    checkGameStatus();
  }, [turn]);

  const handleClick = (row, col) => {
    if (promotionSquare) return;

    if (gameStatus === "ongoing" || gameStatus === "check") {
      if (selectedPiece) {
        if (isLegalMove(selectedPiece.row, selectedPiece.col, row, col)) {
          movePiece(row, col);
        } else {
          setSelectedPiece(null);
        }
      } else {
        const piece = board[row][col];
        if (piece && piece[0] === turn) {
          setSelectedPiece({ row, col, piece });
        }
      }
    } else {
      return;
    }
  };

  const handlePromotion = (newPiece) => {
    if (!promotionSquare) return;
    const newBoard = board.map((row) => [...row]);
    newBoard[promotionSquare.row][promotionSquare.col] = newPiece;
    setBoard(newBoard);
    setPromotionSquare(null);
    setTurn(turn === "W" ? "B" : "W");
  };

  const movePiece = (toRow, toCol) => {
    const newBoard = board.map((row) => [...row]);
    const [fromRow, fromCol] = [selectedPiece.row, selectedPiece.col];
    const movingPiece = selectedPiece.piece;
    const pieceType = movingPiece.slice(1).toLowerCase();

    // Handle capture
    const capturedPiece = newBoard[toRow][toCol];
    if (capturedPiece) {
      const captureColor = movingPiece[0] === "W" ? "W" : "B";
      setCapturedPieces((prev) => ({
        ...prev,
        [captureColor]: [...prev[captureColor], capturedPiece],
      }));
    }

    // Handle castling
    if (pieceType === "king" && Math.abs(fromCol - toCol) === 2) {
      const isKingSide = toCol > fromCol;
      const rookCol = isKingSide ? 7 : 0;
      const newRookCol = isKingSide ? 5 : 3;
      newBoard[toRow][newRookCol] = newBoard[toRow][rookCol];
      newBoard[toRow][rookCol] = "";
    }

    // Handle en passant
    if (
      pieceType === "pawn" &&
      Math.abs(fromCol - toCol) === 1 &&
      newBoard[toRow][toCol] === ""
    ) {
      const capturedPawnRow = fromRow;
      const capturedPawn = newBoard[capturedPawnRow][toCol];
      newBoard[capturedPawnRow][toCol] = "";
      setCapturedPieces((prev) => ({
        ...prev,
        [movingPiece[0]]: [...prev[movingPiece[0]], capturedPawn],
      }));
    }

    // Move the piece
    newBoard[toRow][toCol] = movingPiece;
    newBoard[fromRow][fromCol] = "";

    // Pawn promotion
    if (pieceType === "pawn" && (toRow === 0 || toRow === 7)) {
      newBoard[toRow][toCol] = "";
      setPromotionSquare({
        row: toRow,
        col: toCol,
        color: movingPiece[0],
      });

      setBoard(newBoard);
      setSelectedPiece(null);

      return;
    }

    // Update castling rights
    updateCastlingRights(movingPiece, fromRow, fromCol);

    // Set en passant target
    setEnPassantTarget(
      pieceType === "pawn" && Math.abs(fromRow - toRow) === 2
        ? { row: (fromRow + toRow) / 2, col: toCol }
        : null
    );

    setBoard(newBoard);
    setTurn(turn === "W" ? "B" : "W");
    setSelectedPiece(null);
  };

  const isLegalMove = (startRow, startCol, endRow, endCol) => {
    const piece = board[startRow][startCol];
    if (!piece) return false;
    const pieceType = piece.slice(1).toLowerCase();
    const color = piece[0];

    if (board[endRow][endCol] && board[endRow][endCol][0] === color)
      return false;

    let isLegal = false;

    switch (pieceType) {
      case "pawn":
        isLegal = isPawnMove(startRow, startCol, endRow, endCol, color);
        break;
      case "rook":
        isLegal = isStraightMove(startRow, startCol, endRow, endCol);
        break;
      case "bishop":
        isLegal = isDiagonalMove(startRow, startCol, endRow, endCol);
        break;
      case "queen":
        isLegal =
          isStraightMove(startRow, startCol, endRow, endCol) ||
          isDiagonalMove(startRow, startCol, endRow, endCol);
        break;
      case "king":
        isLegal = isKingMove(startRow, startCol, endRow, endCol, color);
        break;
      case "knight":
        isLegal = isKnightMove(startRow, startCol, endRow, endCol);
        break;
    }

    if (isLegal) {
      // Check if the move puts or leaves the king in check
      const tempBoard = board.map((row) => [...row]);
      tempBoard[endRow][endCol] = tempBoard[startRow][startCol];
      tempBoard[startRow][startCol] = "";
      if (isKingInCheck(color, tempBoard)) {
        return false;
      }
    }

    return isLegal;
  };

  const isPawnMove = (startRow, startCol, endRow, endCol, color) => {
    const direction = color === "W" ? -1 : 1;
    const startingRow = color === "W" ? 6 : 1;

    // Normal move
    if (
      startCol === endCol &&
      endRow === startRow + direction &&
      board[endRow][endCol] === ""
    ) {
      return true;
    }

    // Initial two-square move
    if (
      startCol === endCol &&
      startRow === startingRow &&
      endRow === startRow + 2 * direction &&
      board[startRow + direction][startCol] === "" &&
      board[endRow][endCol] === ""
    ) {
      return true;
    }

    // Capture
    if (
      Math.abs(startCol - endCol) === 1 &&
      endRow === startRow + direction &&
      (board[endRow][endCol] !== "" ||
        (enPassantTarget &&
          enPassantTarget.row === endRow &&
          enPassantTarget.col === endCol))
    ) {
      return true;
    }

    return false;
  };

  const isStraightMove = (startRow, startCol, endRow, endCol) => {
    if (startRow !== endRow && startCol !== endCol) return false;

    const rowStep = startRow === endRow ? 0 : endRow > startRow ? 1 : -1;
    const colStep = startCol === endCol ? 0 : endCol > startCol ? 1 : -1;

    let currentRow = startRow + rowStep;
    let currentCol = startCol + colStep;

    while (currentRow !== endRow || currentCol !== endCol) {
      if (board[currentRow][currentCol] !== "") return false;
      currentRow += rowStep;
      currentCol += colStep;
    }

    return true;
  };

  const isDiagonalMove = (startRow, startCol, endRow, endCol) => {
    if (Math.abs(startRow - endRow) !== Math.abs(startCol - endCol))
      return false;

    const rowStep = endRow > startRow ? 1 : -1;
    const colStep = endCol > startCol ? 1 : -1;

    let currentRow = startRow + rowStep;
    let currentCol = startCol + colStep;

    while (currentRow !== endRow && currentCol !== endCol) {
      if (board[currentRow][currentCol] !== "") return false;
      currentRow += rowStep;
      currentCol += colStep;
    }

    return true;
  };

  const isKingMove = (startRow, startCol, endRow, endCol, color) => {
    if (Math.abs(startRow - endRow) <= 1 && Math.abs(startCol - endCol) <= 1) {
      return true;
    }

    // Castling
    if (startRow === endRow && Math.abs(startCol - endCol) === 2) {
      const isKingSide = endCol > startCol;
      const rookCol = isKingSide ? 7 : 0;

      // The king and rook must not have moved
      if (!castlingRights[color][isKingSide ? "kingSide" : "queenSide"])
        return false;

      if (board[startRow][rookCol] !== `${color}rook`) return false;

      // The squares between the king and rook must be empty
      const direction = isKingSide ? 1 : -1;
      for (let i = startCol + direction; i !== rookCol; i += direction) {
        if (board[startRow][i] !== "") return false;
      }

      // The squares that the king moves through must not be under attack
      for (let i = startCol; i !== endCol + direction; i += direction) {
        if (isSquareUnderAttack(startRow, i, color)) return false;
      }

      return true;
    }

    return false;
  };

  const isKnightMove = (startRow, startCol, endRow, endCol) => {
    const rowDiff = Math.abs(startRow - endRow);
    const colDiff = Math.abs(startCol - endCol);
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
  };

  const isKingInCheck = (color, boardState = board) => {
    let kingRow, kingCol;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (boardState[i][j] === `${color}king`) {
          kingRow = i;
          kingCol = j;
          break;
        }
      }
      if (kingRow !== undefined) break;
    }

    return isSquareUnderAttack(kingRow, kingCol, color, boardState);
  };

  const isSquareUnderAttack = (
    row,
    col,
    defendingColor,
    boardState = board
  ) => {
    const attackingColor = defendingColor === "W" ? "B" : "W";
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (boardState[i][j][0] === attackingColor) {
          if (isLegalMove(i, j, row, col)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const hasLegalMoves = (color, boardState = board) => {
    for (let startRow = 0; startRow < 8; startRow++) {
      for (let startCol = 0; startCol < 8; startCol++) {
        if (
          boardState[startRow][startCol] &&
          boardState[startRow][startCol][0] === color
        ) {
          for (let endRow = 0; endRow < 8; endRow++) {
            for (let endCol = 0; endCol < 8; endCol++) {
              if (isLegalMove(startRow, startCol, endRow, endCol)) {
                const tempBoard = boardState.map((row) => [...row]);
                tempBoard[endRow][endCol] = tempBoard[startRow][startCol];
                tempBoard[startRow][startCol] = "";

                if (!isKingInCheck(color, tempBoard)) {
                  return true;
                }
              }
            }
          }
        }
      }
    }
    return false;
  };

  const updateCastlingRights = (piece, fromRow, fromCol) => {
    const newCastlingRights = { ...castlingRights };
    const color = piece[0];
    const pieceType = piece.slice(1).toLowerCase();

    if (pieceType === "king") {
      newCastlingRights[color].kingSide = false;
      newCastlingRights[color].queenSide = false;
    } else if (pieceType === "rook") {
      if (fromCol === 0) newCastlingRights[color].queenSide = false;
      if (fromCol === 7) newCastlingRights[color].kingSide = false;
    }

    setCastlingRights(newCastlingRights);
  };

  const checkGameStatus = () => {
    const isCheck = isKingInCheck(turn);
    const hasMoves = hasLegalMoves(turn);

    if (isCheck && !hasMoves) {
      setGameStatus("checkmate");
    } else if (isCheck && hasMoves) {
      setGameStatus("check");
    } else if (!isCheck && !hasMoves) {
      setGameStatus("stalemate");
    } else {
      setGameStatus("ongoing");
    }
  };

  const CapturedPieces = ({ pieces, color }) => (
    <div
      className={`flex flex-wrap gap-1 ${
        color === "W" ? "justify-start" : "justify-end"
      }`}
    >
      {pieces.map((piece, index) => (
        <div key={index} className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10">
          <ChessPiece piece={piece} />
        </div>
      ))}
    </div>
  );

  const columnLabels = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const rowLabels = ["8", "7", "6", "5", "4", "3", "2", "1"];

  return (
    <div className="flex flex-col items-center">
      {promotionSquare && (
        <PromotionModal
          onSelect={handlePromotion}
          color={promotionSquare.color}
        />
      )}
      <h2 className="text-lg sm:text-xl lg:text-2xl mb-4 font-bold text-red-500">
        {gameStatus === "ongoing"
          ? `${turn === "W" ? "White" : "Black"}'s Turn`
          : gameStatus === "check"
          ? `${turn === "W" ? "White" : "Black"} is in check!`
          : gameStatus === "checkmate"
          ? `Checkmate! ${turn === "W" ? "Black" : "White"} wins!`
          : gameStatus === "stalemate"
          ? "Stalemate! The game is a draw."
          : `${turn === "W" ? "White" : "Black"} is in check!`}
      </h2>

      <div className="w-full max-w-[80vw] mb-4">
        <CapturedPieces pieces={capturedPieces.W} color="W" />
      </div>

      <div className="flex">
        <div className="grid grid-rows-8 gap-0.5">
          {rowLabels.map((label, index) => (
            <div
              key={index}
              className="flex items-center justify-center font-bold text-lg sm:text-xl mr-7"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-8 gap-0.5">
          {board.map((row, rowIndex) =>
            row.map((piece, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 flex items-center justify-center text-lg sm:text-2xl lg:text-3xl cursor-pointer
                ${
                  (rowIndex + colIndex) % 2 === 0
                    ? "bg-amber-200"
                    : "bg-amber-800"
                }
                ${
                  selectedPiece &&
                  selectedPiece.row === rowIndex &&
                  selectedPiece.col === colIndex
                    ? "bg-yellow-400"
                    : ""
                }
                ${
                  selectedPiece &&
                  isLegalMove(
                    selectedPiece.row,
                    selectedPiece.col,
                    rowIndex,
                    colIndex
                  )
                    ? "bg-green-400"
                    : ""
                }`}
                onClick={() => handleClick(rowIndex, colIndex)}
              >
                <ChessPiece piece={piece} />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-8 gap-0.5 w-full pl-10 mt-6">
        {columnLabels.map((label, index) => (
          <div
            key={index}
            className="w-full text-center font-bold text-lg sm:text-xl"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="w-full max-w-[80vw] mt-4">
        <CapturedPieces pieces={capturedPieces.B} color="B" />
      </div>
    </div>
  );
};

export default ChessBoard;
